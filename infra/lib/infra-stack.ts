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
} from "aws-cdk-lib";
import { PythonFunction } from "@aws-cdk/aws-lambda-python-alpha";
import { HttpLambdaIntegration } from "@aws-cdk/aws-apigatewayv2-integrations-alpha";
import * as apigwv2 from "@aws-cdk/aws-apigatewayv2-alpha";
import { Construct } from "constructs";

export class InfraStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const FULLY_QUALIFIED_DOMAIN = process.env.FULLY_QUALIFIED_DOMAIN ?? "";
    const SUB_DOMAIN = process.env.SUB_DOMAIN ?? "";
    const DOMAIN_NAME = `${SUB_DOMAIN}.${FULLY_QUALIFIED_DOMAIN}`;

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

    const fn = new PythonFunction(this, "SetFireFunction", {
      entry: "../src/",
      runtime: lambda.Runtime.PYTHON_3_9,
      index: "config/asgi.py",
      handler: "handler",
      environment: {
        STATIC_URL: "/static",
        DJANGO_SECRET_KEY: process.env.DJANGO_SECRET_KEY ?? "",
        ALLOWED_HOSTS: DOMAIN_NAME,
        AWS_STORAGE_BUCKET_NAME: bucket.bucketName,
      },
      memorySize: 512,
      timeout: Duration.seconds(20),
      logRetention: logs.RetentionDays.ONE_MONTH,
    });

    bucket.grantReadWrite(fn);

    const setFireCertificate = new acm.DnsValidatedCertificate(
      this,
      "SetFireCert",
      {
        domainName: DOMAIN_NAME,
        hostedZone,
      }
    );

    const setFireIntegration = new HttpLambdaIntegration(
      "setFireIntegration",
      fn
    );

    const apigwDomainName = new apigwv2.DomainName(this, "SetFireDomainName", {
      domainName: DOMAIN_NAME,
      certificate: setFireCertificate,
    });

    const api = new apigwv2.HttpApi(this, "SetFireHttpApi", {
      defaultIntegration: setFireIntegration,
      createDefaultStage: false,
    });
    api.addStage("SetFireDefaultStage", {
      domainMapping: { domainName: apigwDomainName },
      autoDeploy: true,
      throttle: {
        burstLimit: 50,
        rateLimit: 500,
      },
    });

    new route53.ARecord(this, "SetFireAliasRecord", {
      zone: hostedZone,
      recordName: DOMAIN_NAME,
      target: route53.RecordTarget.fromAlias(
        new targets.ApiGatewayv2DomainProperties(
          apigwDomainName.regionalDomainName,
          apigwDomainName.regionalHostedZoneId
        )
      ),
    });
  }
}
