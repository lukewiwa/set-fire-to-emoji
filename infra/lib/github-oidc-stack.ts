import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

export interface GitHubOidcStackProps extends cdk.StackProps {
  /**
   * GitHub organization/username (e.g., "lukewiwa")
   */
  githubOrg: string;

  /**
   * GitHub repository name (e.g., "set-fire-to-emoji")
   */
  githubRepo: string;

  /**
   * Optional: Restrict to specific branches
   * If not provided, allows all branches
   * Example: ["main", "develop"]
   */
  allowedBranches?: string[];
}

/**
 * Stack to create GitHub OIDC identity provider and IAM role
 * for GitHub Actions to deploy AWS CDK stacks
 */
export class GitHubOidcStack extends cdk.Stack {
  public readonly role: iam.Role;

  constructor(scope: Construct, id: string, props: GitHubOidcStackProps) {
    super(scope, id, props);

    // Create OIDC provider for GitHub Actions
    const githubOidcProvider = new iam.OpenIdConnectProvider(
      this,
      "GitHubOidcProvider",
      {
        url: "https://token.actions.githubusercontent.com",
        clientIds: ["sts.amazonaws.com"],
        // Thumbprints are automatically managed by CDK
      }
    );

    // Build the subject claim condition
    // Format: repo:ORG/REPO:ref:refs/heads/BRANCH or repo:ORG/REPO:*
    const subjectClaims = props.allowedBranches
      ? props.allowedBranches.map(
          (branch) =>
            `repo:${props.githubOrg}/${props.githubRepo}:ref:refs/heads/${branch}`
        )
      : [`repo:${props.githubOrg}/${props.githubRepo}:*`];

    // Create IAM role for GitHub Actions
    this.role = new iam.Role(this, "GitHubActionsRole", {
      roleName: "GitHubActions-CDK-Deploy",
      description:
        "Role assumed by GitHub Actions to deploy AWS CDK infrastructure",
      assumedBy: new iam.WebIdentityPrincipal(
        githubOidcProvider.openIdConnectProviderArn,
        {
          StringEquals: {
            "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          },
          StringLike: {
            "token.actions.githubusercontent.com:sub": subjectClaims,
          },
        }
      ),
      maxSessionDuration: cdk.Duration.hours(1),
    });

    // Add managed policies for CDK deployment
    // CloudFormation - required for CDK deployments
    this.role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("AWSCloudFormationFullAccess")
    );

    // Add inline policy with required permissions
    this.role.addToPolicy(
      new iam.PolicyStatement({
        sid: "CDKDeploymentPermissions",
        effect: iam.Effect.ALLOW,
        actions: [
          // S3 - for CDK assets and static files bucket
          "s3:*",
          // Lambda - for Django Lambda function
          "lambda:*",
          // API Gateway - for HTTP API
          "apigateway:*",
          // CloudFront - for CDN distribution
          "cloudfront:*",
          // Route53 - for DNS records
          "route53:*",
          // ACM - for SSL certificates
          "acm:*",
          // CloudWatch Logs - for logging
          "logs:*",
          // IAM - for creating Lambda execution roles
          "iam:*",
          // SSM - for CDK bootstrap
          "ssm:GetParameter",
          "ssm:PutParameter",
          // ECR - for Docker images
          "ecr:*",
          // STS - for assuming roles
          "sts:AssumeRole",
        ],
        resources: ["*"],
      })
    );

    // Output the role ARN for GitHub Actions secret
    new cdk.CfnOutput(this, "GitHubActionsRoleArn", {
      value: this.role.roleArn,
      description: "ARN of the IAM role for GitHub Actions (add this to GitHub Secrets as AWS_ROLE_ARN)",
      exportName: "GitHubActionsRoleArn",
    });

    // Output the OIDC provider ARN
    new cdk.CfnOutput(this, "GitHubOidcProviderArn", {
      value: githubOidcProvider.openIdConnectProviderArn,
      description: "ARN of the GitHub OIDC provider",
      exportName: "GitHubOidcProviderArn",
    });

    // Output the allowed repository
    new cdk.CfnOutput(this, "AllowedRepository", {
      value: `${props.githubOrg}/${props.githubRepo}`,
      description: "GitHub repository allowed to assume this role",
    });

    // Output allowed branches if specified
    if (props.allowedBranches) {
      new cdk.CfnOutput(this, "AllowedBranches", {
        value: props.allowedBranches.join(", "),
        description: "Branches allowed to assume this role",
      });
    }
  }
}
