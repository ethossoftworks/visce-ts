# Build
`yarn build` or `yarn build-dev`
<br/><br/>

# Develop
1. Open two terminals
2. Run `yarn start-ts` in the first
3. Run `yarn start-bundler` in the second
<br/><br/>

# Test
`yarn build-test` or `yarn test`
<br/><br/>

# Things to Update

### `webpack.config.js`
* Change `projectName` variable
* Update `entry.libs` to include all vendor libraries

### `package.json`
* `test` script file name
* `test-inspect` script file name
* `bundle-inspect` script file name
* `bundle-inspect-libs` script file name

### `scripts-update-local-lib.js`
* Change `libName` variable