const network = hre.network.name;
const fs = require("fs");

async function main() {
  const dir = "./networks/";
  const fileName = "MockNFT_" + `${network}.json`;
  const data = JSON.parse(await fs.readFileSync(dir + fileName, { encoding: "utf8" }));

  try {
    await hre.run("verify:verify", {
      address: data.MockNFT,
      constructorArguments: [process.env.NFT_URI],
      contract: "contracts/MockNFT.sol:MockNFT",
    });
  } catch (e) {
    console.log(e);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
