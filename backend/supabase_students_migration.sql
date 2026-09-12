-- Run this once in Supabase SQL Editor while FastAPI is stopped.
-- It converts the legacy students table to the current Student model.

begin;

do $$
begin
    if exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'students'
          and column_name = 'name'
    ) and not exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'students'
          and column_name = 'full_name'
    ) then
        alter table public.students rename column name to full_name;
    end if;
end
$$;

alter table public.students add column if not exists full_name varchar(200);
alter table public.students add column if not exists programme varchar(200);
alter table public.students add column if not exists semester varchar(100);
alter table public.students add column if not exists module_name varchar(200);
alter table public.students add column if not exists exam_date date;
alter table public.students add column if not exists attendance_percentage double precision;
alter table public.students add column if not exists exam_1_score double precision;
alter table public.students add column if not exists exam_2_score double precision;
alter table public.students add column if not exists final_exam_score double precision;

do $$
begin
    if exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'students'
          and column_name = 'name'
    ) then
        update public.students set full_name = name where full_name is null;
        alter table public.students drop column name;
    end if;
end
$$;

commit;