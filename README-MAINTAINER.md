# README-MAINTAINER

## How to make new releases

### Update the VERSION file

The format is `3.1.1-1`.

### Bump version

```sh
yarn run my-bump-version
```

### Update repo

In the `development` branch, commit and push.

### Run a test build

```sh
yarn run my-release
```

### Check tag

The must be a new tag, like `v3.1.1-1`.

### Create release

In the [Releases](https://github.com/cronica-it/docusaurus-fork/releases) page, add a new release.

Attach all archives in the `release` folder.

Document the changes occurred in the release.
