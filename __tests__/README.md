# Tofu Apply Action tests

Run the complete Jest suite with:

```bash
npm test -- --runInBand
```

`index.test.js` checks flag helpers and command construction. `integration.test.js` checks command construction for common workflow scenarios; it does not run OpenTofu or deploy infrastructure.

`run.test.js` exercises the action's execution path with real child processes and pipes. It replaces the `tofu` executable with synthetic Node programs and mocks the GitHub Actions toolkit, so it requires no OpenTofu installation, credentials, or providers.

The runtime tests cover:

- Preserving 3 MiB of stdout and 3 MiB of stderr in the log file.
- Delivering both live streams before the child process finishes.
- Suppressing console output while retaining the complete log.
- Flushing logs and publishing exit codes on failure, launch errors, and signal termination.
- Creating distinct log files for repeated executions.
- Passing paths and variable values with spaces and shell syntax as literal arguments.
- Publishing a log path without placing the log text in action outputs.

Run only the runtime tests with:

```bash
npx jest __tests__/run.test.js --runInBand
```

The fixtures directory contains sample OpenTofu configuration and variable files for reference. The automated suite does not apply them.
