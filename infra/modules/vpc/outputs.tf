output "vpc_id" {
  description = "作成された VPC の ID"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "パブリックサブネットの ID 一覧"
  value       = [for s in aws_subnet.public : s.id]
}

output "private_subnet_ids" {
  description = "プライベートサブネットの ID 一覧"
  value       = [for s in aws_subnet.private : s.id]
}

output "nat_gateway_id" {
  description = "NAT Gateway の ID（enable_nat_gateway = false の場合は null）"
  value       = length(aws_nat_gateway.main) > 0 ? aws_nat_gateway.main[0].id : null
}

output "public_route_table_id" {
  description = "パブリックルートテーブルの ID"
  value       = aws_route_table.public.id
}

output "private_route_table_id" {
  description = "プライベートルートテーブルの ID"
  value       = aws_route_table.private.id
}
