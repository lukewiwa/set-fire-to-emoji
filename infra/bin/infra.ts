#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { InfraStack } from "../lib/infra-stack";
import { CertificateStack } from "../lib/certificate-stack";

const app = new cdk.App();

const certificateStack = new CertificateStack(app, "SetFireCertificateStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: "us-east-1",
  },
  crossRegionReferences: true,
});
new InfraStack(app, "SetFireInfraStack", certificateStack.certificate, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  crossRegionReferences: true,
}).addDependency(certificateStack);
