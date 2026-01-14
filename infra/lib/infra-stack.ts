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
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { LogGroupLogDestination } from "aws-cdk-lib/aws-apigatewayv2";
import { AccessLogFormat } from "aws-cdk-lib/aws-apigateway";
import { Construct } from "constructs";

export class InfraStack extends Stack {
  constructor(
    scope: Construct,
    id: string,
    certificate: acm.Certificate,
    hostedZone: route53.IHostedZone,
    props?: StackProps
  ) {
    super(scope, id, props);

    const domainName = hostedZone.zoneName;

    const bucket = new s3.Bucket(this, "SetFireBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      lifecycleRules: [{ expiration: Duration.days(1) }],
    });

    const djangoSecretKey = this.node.tryGetContext("djangoSecretKey") ?? "insecure-default-key";

    const fn = new lambda.DockerImageFunction(this, "SetFireFunctionDocker", {
      code: lambda.DockerImageCode.fromImageAsset(".."),
      environment: {
        DJANGO_SECRET_KEY: djangoSecretKey,
        ALLOWED_HOSTS: `${domainName},127.0.0.1`,
        AWS_STORAGE_BUCKET_NAME: bucket.bucketName,
      },
      memorySize: 1024,
      timeout: Duration.seconds(20),
      logGroup: new logs.LogGroup(this, "SetFireFunctionLogs", {
        retention: logs.RetentionDays.ONE_MONTH,
      }),
      architecture: lambda.Architecture.ARM_64,
    });

    bucket.grantReadWrite(fn);

    const setFireIntegration = new HttpLambdaIntegration(
      "setFireIntegration",
      fn
    );

    const accessLogs = new logs.LogGroup(this, "SetFireAccessLogs", {
      retention: logs.RetentionDays.ONE_WEEK,
    });

    const api = new apigwv2.HttpApi(this, "SetFireHttpApi", {
      defaultIntegration: setFireIntegration,
      createDefaultStage: false,
    });

    api.addStage("SetFireDefaultStage", {
      autoDeploy: true,
      throttle: {
        burstLimit: 50,
        rateLimit: 500,
      },
      accessLogSettings: {
        destination: new LogGroupLogDestination(accessLogs),
        format: AccessLogFormat.jsonWithStandardFields(),
      },
    });

    // CloudFront distribution with API Gateway origin
    const distribution = new cloudfront.Distribution(
      this,
      "SetFireCloudfrontDistribution",
      {
        certificate,
        domainNames: [domainName],
        defaultBehavior: {
          origin: new origins.HttpOrigin(
            `${api.apiId}.execute-api.${this.region}.amazonaws.com`
          ),
          functionAssociations: [
            {
              function: new cloudfront.Function(
                this,
                "SetFireForwardHeaderCfFunction",
                {
                  code: cloudfront.FunctionCode.fromFile({
                    filePath: "./lib/forwardHostFunction.js",
                  }),
                  runtime: cloudfront.FunctionRuntime.JS_2_0,
                }
              ),
              eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
            },
          ],
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
      recordName: domainName,
      target: route53.RecordTarget.fromAlias(
        new targets.CloudFrontTarget(distribution)
      ),
    });
  }
}
