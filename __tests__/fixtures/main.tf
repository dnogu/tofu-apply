terraform {
  required_providers {
    random = {
      source  = "hashicorp/random"
      version = "~> 3.1"
    }
  }
  
  backend "local" {
    path = "terraform.tfstate"
  }
}

variable "random_length" {
  description = "Length of the random string"
  type        = number
  default     = 8
}

variable "random_prefix" {
  description = "Prefix for the random string"
  type        = string
  default     = "test"
}

resource "random_string" "example" {
  length  = var.random_length
  special = false
  upper   = false
}

resource "random_password" "example" {
  length  = 16
  special = true
}

output "random_string_value" {
  value = "${var.random_prefix}-${random_string.example.result}"
}

output "random_password_value" {
  value     = random_password.example.result
  sensitive = true
}
