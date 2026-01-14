#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { InfraStack } from "../lib/infra-stack";
import { CertificateStack } from "../lib/certificate-stack";
import { DNSStack } from "../lib/dns-stack";
import { OidcStack } from "../lib/oidc-stack";

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION ?? "ap-southeast-2",
};

// OIDC stack - Creates GitHub OIDC provider and IAM role for GitHub Actions
// This should be deployed first, before other stacks
new OidcStack(app, "SetFireOidcStack", {
  env,
});

// DNS stack - Route53 hosted zone
// Deploy this second to create the hosted zone
const dnsStack = new DNSStack(app, "SetFireDNSStack", {
  env,
  crossRegionReferences: true,
});

// Certificate stack - must be in us-east-1 for CloudFront
const certificateStack = new CertificateStack(
  app,
  "SetFireCertificateStack",
  dnsStack.hostedZone,
  {
    env: {
      account: env.account,
      region: "us-east-1",
    },
    crossRegionReferences: true,
  }
);
certificateStack.addDependency(dnsStack);

// Infrastructure stack - in primary region
const infraStack = new InfraStack(
  app,
  "SetFireInfraStack",
  certificateStack.certificate,
  dnsStack.hostedZone,
  {
    env,
    crossRegionReferences: true,
  }
);
infraStack.addDependency(certificateStack);
infraStack.addDependency(dnsStack);
