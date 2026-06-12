package contrafactico.governance

import rego.v1

default block_recommendation := false
default human_approval_required := false

block_recommendation if {
  input.premise_contradicted
  input.readership_ratio < 0.5
  input.impact_usd >= 25000
}

human_approval_required if {
  block_recommendation
}

severity := "critical" if {
  block_recommendation
}
