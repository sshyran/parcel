// @flow
import path from 'path';

import * as fs from '@parcel/fs';
import type {
  Environment,
  FilePath,
  Glob,
  PackageJSON,
  PackageName,
  ParcelOptions
} from '@parcel/types';
import {loadConfig} from '@parcel/utils';

const NODE_MODULES = `${path.sep}node_modules${path.sep}`;

type ConfigOpts = {|
  searchPath: FilePath,
  env: Environment,
  options: ParcelOptions,
  resolvedPath?: FilePath,
  result?: any,
  includedFiles?: Iterator<FilePath>,
  watchGlob?: Glob,
  devDeps?: Iterator<[PackageName, ?string]>
|};

export default class Config {
  searchPath: FilePath;
  env: Environment;
  options: ParcelOptions;
  resolvedPath: ?FilePath;
  result: ?any;
  resultHash: ?string;
  includedFiles: Set<FilePath>;
  watchGlob: ?Glob;
  devDeps: Map<PackageName, ?string>;
  pkg: ?PackageJSON;

  constructor({
    searchPath,
    env,
    options,
    resolvedPath,
    result,
    includedFiles,
    watchGlob,
    devDeps
  }: ConfigOpts) {
    this.searchPath = searchPath;
    this.env = env;
    this.options = options;
    this.resolvedPath = resolvedPath;
    this.result = result || null;
    this.includedFiles = new Set(includedFiles);
    this.watchGlob = watchGlob;
    this.devDeps = new Map(devDeps);
  }

  serialize() {
    return {
      searchPath: this.searchPath,
      env: this.env,
      options: this.options,
      resolvedPath: this.resolvedPath,
      result: this.result,
      includedFiles: [...this.includedFiles],
      watchGlob: this.watchGlob,
      devDeps: [...this.devDeps]
    };
  }

  setResolvedPath(filePath: FilePath) {
    this.resolvedPath = filePath;
  }

  setResult(result: any) {
    this.result = result;
  }

  setResultHash(resultHash: string) {
    this.resultHash = resultHash;
  }

  addIncludedFile(filePath: FilePath) {
    this.includedFiles.add(filePath);
  }

  setDevDep(name: PackageName, version?: string) {
    this.devDeps.set(name, version);
  }

  getDevDepVersion(name: PackageName) {
    return this.devDeps.get(name);
  }

  setWatchGlob(glob: string) {
    this.watchGlob = glob;
  }

  // This will be more useful when we have edge types
  getInvalidations() {
    let invalidations = [];

    if (this.watchGlob) {
      invalidations.push({
        action: 'add',
        pattern: this.watchGlob
      });
    }

    for (let filePath of [this.resolvedPath, ...this.includedFiles]) {
      invalidations.push({
        action: 'change',
        pattern: filePath
      });

      invalidations.push({
        action: 'unlink',
        pattern: filePath
      });
    }

    return invalidations;
  }

  async getConfig(
    filePaths: Array<FilePath>,
    options: ?{packageKey?: string, parse?: boolean}
  ): Promise<Config | null> {
    let packageKey = options?.packageKey;
    let parse = options && options.parse;

    if (packageKey != null) {
      let pkg = await this.getPackage();
      if (pkg && pkg[packageKey]) {
        return pkg[packageKey];
      }
    }

    let conf = await loadConfig(
      this.searchPath,
      filePaths,
      parse == null ? null : {parse}
    );
    if (!conf) {
      return null;
    }

    for (let file of conf.files) {
      this.addIncludedFile(file);
    }

    return conf.config;
  }

  async getPackage(): Promise<PackageJSON | null> {
    if (this.pkg) {
      return this.pkg;
    }

    this.pkg = await this.getConfig(['package.json']);
    return this.pkg;
  }

  async isSource() {
    // TODO: pick a better name?
    let pkg = await this.getPackage();
    return (
      !!(
        pkg &&
        pkg.source &&
        (await fs.realpath(this.searchPath)) !== this.searchPath
      ) || !this.searchPath.includes(NODE_MODULES)
    );
  }
}
