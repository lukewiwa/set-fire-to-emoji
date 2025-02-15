import {
  Stack,
  StackProps,
  Duration,
  aws_s3 as s3,
  aws_lambda as lambda,
  aws_logs as logs,
  aws_route53 as route53,
  aws_route53_targets as targets,
  aws_certificatemanager as acm,
  aws_apigatewayv2 as apigwv2,
  aws_cloudfront as cloudfront,
  aws_cloudfront_origins as origins,
} from "aws-cdk-lib";
import { CfnStage } from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { Construct } from "constructs";
import { DOMAIN_NAME, FULLY_QUALIFIED_DOMAIN } from "./settings";

export class InfraStack extends Stack {
  constructor(
    scope: Construct,
    id: string,
    certificate: acm.Certificate,
    props?: StackProps
  ) {
    super(scope, id, props);

    const hostedZone = route53.HostedZone.fromLookup(
      this,
      "SetFireHostedZone",
      {
        domainName: FULLY_QUALIFIED_DOMAIN,
      }
    );

    const bucket = new s3.Bucket(this, "SetFireBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      lifecycleRules: [{ expiration: Duration.days(1) }],
    });

    const fn = new lambda.DockerImageFunction(this, "SetFireFunctionDocker", {
      code: lambda.DockerImageCode.fromImageAsset(".."),
      environment: {
        DJANGO_SECRET_KEY: process.env.DJANGO_SECRET_KEY ?? "",
        ALLOWED_HOSTS: `${DOMAIN_NAME},127.0.0.1`,
        AWS_STORAGE_BUCKET_NAME: bucket.bucketName,
      },
      memorySize: 1024,
      timeout: Duration.seconds(20),
      logRetention: logs.RetentionDays.ONE_MONTH,
      architecture: lambda.Architecture.ARM_64,
    });

    bucket.grantReadWrite(fn);

    const setFireIntegration = new HttpLambdaIntegration(
      "setFireIntegration",
      fn
    );

    const api = new apigwv2.HttpApi(this, "SetFireHttpApi", {
      defaultIntegration: setFireIntegration,
      createDefaultStage: false,
    });
    const defaultStage = api.addStage("SetFireDefaultStage", {
      autoDeploy: true,
      throttle: {
        burstLimit: 50,
        rateLimit: 500,
      },
    });
    const cfnStage = defaultStage.node.defaultChild as CfnStage;
    const accessLogs = new logs.LogGroup(this, "SetFireAccessLogs", {
      retention: logs.RetentionDays.ONE_WEEK,
    });
    cfnStage.accessLogSettings = {
      destinationArn: accessLogs.logGroupArn,
      format: JSON.stringify({
        requestId: "$context.requestId",
        ip: "$context.identity.sourceIp",
        requestTime: "$context.requestTime",
        httpMethod: "$context.httpMethod",
        routeKey: "$context.routeKey",
        path: "$context.path",
        status: "$context.status",
        protocol: "$context.protocol",
        responseLength: "$context.responseLength",
      }),
    };

    // This is apparently the structure of the API endpoint
    // https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-custom-domain-names.html
    const distribution = new cloudfront.Distribution(
      this,
      "SetFireCloudfrontDistribution",
      {
        certificate,
        domainNames: [DOMAIN_NAME],
        defaultBehavior: {
          origin: new origins.HttpOrigin(
            `${api.apiId}.execute-api.${this.region}.amazonaws.com`
          ),
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
          originRequestPolicy:
            cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },
      }
    );

    new route53.ARecord(this, "SetFireAliasRecord", {
      zone: hostedZone,
      recordName: DOMAIN_NAME,
      target: route53.RecordTarget.fromAlias(
        new targets.CloudFrontTarget(distribution)
      ),
    });
  }
}
