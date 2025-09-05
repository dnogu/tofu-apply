# GitHub Tofu Plan Action

This GitHub Action runs `tofu plan` with all supported options, automating OpenTofu planning in your CI/CD workflows.

## Quick Start

The most basic usage - create a plan for OpenTofu in your current directory:

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: dnogu/tofu-plan@v1
```

## Usage

```yaml
name: Plan OpenTofu
on:
  push:
    branches: [ main ]
jobs:
  tofu-plan:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
      - name: Run tofu plan
        uses: dnogu/tofu-plan@v1
        with:
          working-directory: ./infra
          destroy: false
          refresh-only: false
          refresh: true
          replace: ""
          target: ""
          target-file: ""
          exclude: ""
          exclude-file: ""
          var: "foo=bar,bar=baz"
          var-file: "variables.tfvars"
          out: "tfplan"
          compact-warnings: false
          detailed-exitcode: false
          generate-config-out: ""
          input: false
          json: false
          lock: true
          lock-timeout: "0s"
          no-color: false
          concise: false
          parallelism: 10
          state: ""
          show-sensitive: false

```

## Inputs

| Name                | Description                                                                 | Default      |
|---------------------|-----------------------------------------------------------------------------|-------------|
| working-directory   | The directory in which to run tofu plan.                                    | `.`         |
| chdir               | Switch working directory before executing tofu plan (--chdir).               | `''`        |
| destroy             | Create a destroy plan (--destroy).                                          | `false`     |
| refresh-only        | Create a refresh-only plan (--refresh-only).                                | `false`     |
| refresh             | Skip the default behavior of syncing state before planning (--refresh=false). | `true`      |
| replace             | Force replacement of particular resource instances (--replace=ADDRESS).      | `''`        |
| target              | Limit planning to only the given resource instances (--target=ADDRESS).      | `''`        |
| target-file         | Limit planning to resource instances listed in file (--target-file=FILE).    | `''`        |
| exclude             | Exclude specific resource instances from planning (--exclude=ADDRESS).       | `''`        |
| exclude-file        | Exclude resource instances listed in file (--exclude-file=FILE).            | `''`        |
| var                 | Set input variable(s) (--var NAME=VALUE, comma separated).                  | `''`        |
| var-file            | Set input variables from file(s) (--var-file=FILENAME, comma separated).     | `''`        |
| out                 | Write the plan to the given filename (--out=FILENAME).                      | `''`        |
| compact-warnings    | Show warning messages in compact form (--compact-warnings).                 | `false`     |
| detailed-exitcode   | Return detailed exit code (--detailed-exitcode).                            | `false`     |
| generate-config-out | Generate configuration for import blocks (--generate-config-out=PATH).      | `''`        |
| input               | Ask for input if necessary (--input=true|false).                            | `false`     |
| json                | Produce output in JSON format (--json).                                     | `false`     |
| lock                | Enable or disable state locking (--lock=true|false).                        | `true`      |
| lock-timeout        | Override the time to wait for a state lock (--lock-timeout=DURATION).       | `0s`        |
| no-color            | Disable color codes in output (--no-color).                                 | `false`     |
| concise             | Disable progress-related messages (--concise).                              | `false`     |
| parallelism         | Limit the number of concurrent operations (--parallelism=n).                | `10`        |
| state               | Legacy option for local backend only (--state=STATEFILE).                   | `''`        |
| show-sensitive      | Display sensitive values in output (--show-sensitive).                      | `false`     |
| display-plan        | Display the plan output in the GitHub Actions log (true/false).             | `true`      |

## Outputs

| Name         | Description                      |
|--------------|----------------------------------|
| plan-output  | The output from tofu plan.       |
| exitcode     | The exit code from tofu plan.    |


## Examples

### Basic Tofu Plan
```yaml
steps:
  - name: Checkout code
    uses: actions/checkout@v4
  
  - name: Setup OpenTofu
    uses: opentofu/setup-opentofu@v1
    with:
      tofu_version: '1.8.0'
  
  - name: Run Basic Tofu Plan
    uses: dnogu/tofu-plan@v1
    with:
      working-directory: ./infra
```

### Tofu Plan with Variables
```yaml
steps:
  - name: Checkout code
    uses: actions/checkout@v4
  
  - name: Setup OpenTofu
    uses: opentofu/setup-opentofu@v1
    with:
      tofu_version: '1.8.0'
  
  - name: Run tofu plan with variables
    uses: dnogu/tofu-plan@v1
    with:
      working-directory: ./infra
      var: "environment=production,region=us-east-1"
      var-file: "prod.tfvars"
```

### Tofu Plan with Output File
```yaml
steps:
  - name: Checkout code
    uses: actions/checkout@v4
  
  - name: Setup OpenTofu
    uses: opentofu/setup-opentofu@v1
    with:
      tofu_version: '1.8.0'
  
  - name: Create Plan
    uses: dnogu/tofu-plan@v1
    with:
      working-directory: ./infra
      out: "tfplan"
  
  - name: Upload Plan
    uses: actions/upload-artifact@v4
    with:
      name: terraform-plan
      path: ./infra/tfplan
```

### Quiet Plan (No Output Display)
```yaml
steps:
  - name: Checkout code
    uses: actions/checkout@v4
  
  - name: Setup OpenTofu
    uses: opentofu/setup-opentofu@v1
    with:
      tofu_version: '1.8.0'
  
  - name: Run Quiet Plan
    uses: dnogu/tofu-plan@v1
    with:
      working-directory: ./infra
      display-plan: false
      out: "plan-output"
```

## Author

- dnogu

## License

MIT

---

*This action has been updated to use `tofu plan` instead of `tofu init`. For OpenTofu initialization, consider using a separate init action first.*
