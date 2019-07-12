// @flow
import {loadPartialConfig} from '@babel/core';
import getEnvOptions from './env';
import getJSXOptions from './jsx';
import getFlowOptions from './flow';

type BabelConfig = {
  plugins?: Array<any>,
  presets?: Array<any>
};

export default function loadConfig(config) {
  let partialConfig = loadPartialConfig({filename: config.searchPath});
  if (partialConfig.hasFilesystemConfig()) {
    // TODO: implement custom babel config support
  } else {
    buildDefaultBabelConfig(config);
  }
}

async function buildDefaultBabelConfig(config) {
  let babelOptions = await getEnvOptions(config);
  // let jsxConfig = await getJSXOptions(config);
  // babelOptions = mergeConfigs(babelOptions, jsxConfig);
  // let flowConfig = await getFlowOptions(config);
  // babelOptions = mergeConfigs(babelOptions, flowConfig);

  config.setResult(babelOptions);
}

function mergeConfigs(result, config?: null | BabelConfig) {
  if (
    !config ||
    ((!config.presets || config.presets.length === 0) &&
      (!config.plugins || config.plugins.length === 0))
  ) {
    return result;
  }

  let merged = result;
  if (merged) {
    merged.presets = (merged.presets || []).concat(config.presets || []);
    merged.plugins = (merged.plugins || []).concat(config.plugins || []);
  } else {
    result = config;
  }

  return result;
}
