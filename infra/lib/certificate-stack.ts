import {
  aws_certificatemanager as acm,
  aws_route53 as route53,
  Stack,
  StackProps,
} from "aws-cdk-lib";
import { Construct } from "constructs";

export class CertificateStack extends Stack {
  public certificate: acm.Certificate;

  constructor(
    scope: Construct,
    id: string,
    hostedZone: route53.IHostedZone,
    props?: StackProps
  ) {
    super(scope, id, props);
    this.certificate = new acm.Certificate(this, "SetFireCertificate", {
      domainName: hostedZone.zoneName,
      validation: acm.CertificateValidation.fromDns(hostedZone),
    });
  }
}
