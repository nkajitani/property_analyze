FROM hashicorp/terraform:1.13

ARG TERRAGRUNT_VERSION=0.83.2

USER root

RUN apk add --no-cache bash curl ca-certificates git unzip \
  && curl -L \
    -o /usr/local/bin/terragrunt \
    "https://github.com/gruntwork-io/terragrunt/releases/download/v${TERRAGRUNT_VERSION}/terragrunt_linux_amd64" \
  && chmod +x /usr/local/bin/terragrunt

WORKDIR /workspace

ENTRYPOINT ["/bin/sh"]
