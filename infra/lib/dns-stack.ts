import { Stack, StackProps } from "aws-cdk-lib";
import * as route53 from "aws-cdk-lib/aws-route53";
import { Construct } from "constructs";

export class DNSStack extends Stack {
  public hostedZone: route53.HostedZone;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const fqdn = this.node.tryGetContext("fullyQualifiedDomain");
    if (!fqdn) {
      throw new Error(
        "No context value found for 'fullyQualifiedDomain'. " +
          "Set it in cdk.json or use: cdk deploy -c fullyQualifiedDomain=<value>"
      );
    }

    this.hostedZone = new route53.HostedZone(this, "SetFireHostedZone", {
      zoneName: fqdn,
    });
  }
}
