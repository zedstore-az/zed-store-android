DROP TRIGGER IF EXISTS finance_entries_activity_log ON public.finance_entries;
CREATE TRIGGER finance_entries_activity_log
AFTER INSERT OR UPDATE OR DELETE ON public.finance_entries
FOR EACH ROW EXECUTE FUNCTION public.write_activity_log();
