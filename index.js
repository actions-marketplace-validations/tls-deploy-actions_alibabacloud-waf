const fs = require("fs");

const core = require("@actions/core");

const AliyunClient = require("@alicloud/pop-core");

const input = {
  accessKeyId: core.getInput("access-key-id"),
  accessKeySecret: core.getInput("access-key-secret"),
  securityToken: core.getInput("security-token"),
  fullchainFile: core.getInput("fullchain-file"),
  keyFile: core.getInput("key-file"),
  wafDomains: core.getInput("waf-domains"),
  wafInstanceId: core.getInput("waf-instance-id"),
};

/**
 * @param {string} endpoint
 * @param {string} apiVersion
 * @param {string} action
 * @param {Record<string, unknown>} params
 */
function callAliyunApi(endpoint, apiVersion, action, params) {
  return new AliyunClient({
    ...(input.accessKeyId && input.accessKeySecret
      ? {
          accessKeyId: input.accessKeyId,
          accessKeySecret: input.accessKeySecret,
        }
      : {}),
    ...(input.securityToken
      ? {
          securityToken: input.securityToken,
        }
      : {}),
    endpoint,
    apiVersion,
  }).request(action, params, { method: "POST", timeout: 60000 });
}

async function deployCertificateToWaf() {
  const domains = Array.from(
    new Set(input.wafDomains.split(/\s+/).filter((x) => x))
  );
  const fullchain = fs.readFileSync(input.fullchainFile, "utf-8");
  const key = fs.readFileSync(input.keyFile, "utf-8");

  for (const domain of domains) {
    console.log(`Deploying certificate to WAF domain ${domain}.`);

    await callAliyunApi(
      "https://wafopenapi.cn-hangzhou.aliyuncs.com",
      "2019-09-10",
      "CreateCertificate",
      {
        Domain: domain,
        Certificate: fullchain,
        PrivateKey: key,
        CertificateName: 'ghactions-' + (new Date).toISOString().substr(0, 19).replace(/[\:\-\T\Z]+/g, ''),
        InstanceId: input.wafInstanceId,
      }
    );
  }
}

async function main() {
  if (input.wafDomains) await deployCertificateToWaf();
}

main().catch((error) => {
  console.log(error.stack);
  core.setFailed(error);
  process.exit(1);
});
