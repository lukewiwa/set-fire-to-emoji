#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { InfraStack } from "../lib/infra-stack";
import { CertificateStack } from "../lib/certificate-stack";
import { GitHubOidcStack } from "../lib/github-oidc-stack";

const app = new cdk.App();

// GitHub OIDC Stack - for CI/CD authentication
// This stack should be deployed first, manually, to bootstrap GitHub Actions
const githubOidcStack = new GitHubOidcStack(app, "SetFireGitHubOidcStack", {
  githubOrg: "lukewiwa",
  githubRepo: "set-fire-to-emoji",
  // Optional: Restrict to specific branches
  // allowedBranches: ["main"],
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || "us-east-1",
  },
});

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
