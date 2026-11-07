import { generateKeyPairSync } from "node:crypto";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
});
const privatePem = privateKey.export({ type: "pkcs8", format: "pem" });
const jwks = JSON.stringify({
  keys: [{ ...publicKey.export({ format: "jwk" }), use: "sig", alg: "RS256" }],
});

process.stderr.write(
  "SECRET OUTPUT: copy only into your Convex deployment environment settings. Do not commit or share.\n",
);
process.stdout.write(
  `JWT_PRIVATE_KEY="${privatePem.trimEnd().replace(/\n/g, " ")}"\n`,
);
process.stdout.write(`JWKS=${jwks}\n`);
