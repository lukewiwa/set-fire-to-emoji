import { Stack, StackProps, CfnOutput, Duration } from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

export interface OidcStackProps extends StackProps {
  /**
   * GitHub organization or username
   * @default - uses context value "githubOrg"
   */
  readonly githubOrg?: string;

  /**
   * GitHub repository name
   * @default - uses context value "githubRepo"
   */
  readonly githubRepo?: string;

  /**
   * GitHub branches that can assume the role
   * @default - ["main", "master"]
   */
  readonly githubBranches?: string[];
}

export class OidcStack extends Stack {
  public readonly deployRole: iam.Role;

  constructor(scope: Construct, id: string, props?: OidcStackProps) {
    super(scope, id, props);

    const githubOrg =
      props?.githubOrg ?? this.node.tryGetContext("githubOrg");
    const githubRepo =
      props?.githubRepo ?? this.node.tryGetContext("githubRepo");
    const githubBranches = props?.githubBranches ?? ["main", "master"];

    if (!githubOrg) {
      throw new Error(
        "GitHub organization must be provided via props or context (githubOrg)"
      );
    }
    if (!githubRepo) {
      throw new Error(
        "GitHub repository must be provided via props or context (githubRepo)"
      );
    }

    // Create the GitHub OIDC provider
    const githubProvider = new iam.OpenIdConnectProvider(
      this,
      "GitHubOidcProvider",
      {
        url: "https://token.actions.githubusercontent.com",
        clientIds: ["sts.amazonaws.com"],
      }
    );

    // Create the IAM role that GitHub Actions will assume
    this.deployRole = new iam.Role(this, "GitHubActionsDeployRole", {
      roleName: "GitHubActionsSetFireDeployRole",
      assumedBy: new iam.FederatedPrincipal(
        githubProvider.openIdConnectProviderArn,
        {
          StringEquals: {
            "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          },
          StringLike: {
            "token.actions.githubusercontent.com:sub": [
              // Allow branch-based deployments
              ...githubBranches.map(
                (branch) =>
                  `repo:${githubOrg}/${githubRepo}:ref:refs/heads/${branch}`
              ),
              // Allow tag-based deployments (semantic versioning only)
              `repo:${githubOrg}/${githubRepo}:ref:refs/tags/v*`,
            ],
          },
        },
        "sts:AssumeRoleWithWebIdentity"
      ),
      description:
        "Role assumed by GitHub Actions for deploying SetFire application",
      maxSessionDuration: Duration.hours(1),
    });

    // Grant administrator access for CDK deployments
    // Note: In production, you should scope this down to specific permissions
    this.deployRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("AdministratorAccess")
    );

    // Output the role ARN for use in GitHub Actions
    new CfnOutput(this, "DeployRoleArn", {
      value: this.deployRole.roleArn,
      description: "ARN of the IAM role for GitHub Actions to assume",
      exportName: "GitHubActionsSetFireDeployRoleArn",
    });
  }
}
