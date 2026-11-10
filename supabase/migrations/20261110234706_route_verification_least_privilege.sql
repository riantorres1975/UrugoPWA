-- Override any default grants so the evidence log only allows reading and appending.
revoke all on table public.route_field_verifications from service_role;
grant select, insert on table public.route_field_verifications to service_role;
