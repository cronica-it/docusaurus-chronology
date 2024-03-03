# README-MAINTAINER

## How to make new releases

### Update the VERSION file

The format is `3.1.1-4`.

### Update the README-MAINTAINER

Update the version in this file.

Commit and push the new version.

### Bump version

```sh
yarn run my-bump-version
```

### Update the repo

In the `development` branch, check the tagged commit and push.

Push the new tag to `origin`.

### Run a test build

```sh
yarn run my-release
```

### Create release

In the [Releases](https://github.com/cronica-it/docusaurus-chronology/releases) page, add a new release.

Attach all archives in the `release` folder.

Document the changes occurred in the release.
