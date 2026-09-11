const path = require("path");

process.env.BABEL_ENV = "test";
process.env.NODE_ENV = "test";
process.env.PUBLIC_URL = "";

const root = path.resolve(__dirname, "..");
process.chdir(root);

const createJestConfig = require(path.join(root, "node_modules/react-scripts/scripts/utils/createJestConfig"));
const config = createJestConfig(
  relativePath => path.resolve(root, "node_modules/react-scripts", relativePath),
  root,
  false
);

delete config.testMatch;
config.testRegex = ["[\\\\/]src[\\\\/].*\\.test\\.[jt]sx?$"];

require(path.join(root, "node_modules/jest"))
  .runCLI({ config: JSON.stringify(config), runInBand: true, watch: false }, [root])
  .then(({ results }) => {
    process.exitCode = results.success ? 0 : 1;
  })
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
