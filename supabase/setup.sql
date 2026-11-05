insert into storage.buckets (id, name, public, file_size_limit)
values
  ('chatpulse-avatars', 'chatpulse-avatars', true, 10485760),
  ('chatpulse-files', 'chatpulse-files', false, 10485760)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

drop policy if exists "ChatPulse users upload their own avatars" on storage.objects;
create policy "ChatPulse users upload their own avatars"
on storage.objects
for insert
to public
with check (
  bucket_id = 'chatpulse-avatars'
  and (storage.foldername(name))[2] = (select auth.jwt()->>'sub')
  and (select auth.jwt()->>'iss') = 'https://securetoken.google.com/chatpulse-35264'
  and (select auth.jwt()->>'aud') = 'chatpulse-35264'
);

drop policy if exists "ChatPulse users update their own avatars" on storage.objects;
create policy "ChatPulse users update their own avatars"
on storage.objects
for update
to public
using (
  bucket_id = 'chatpulse-avatars'
  and (storage.foldername(name))[2] = (select auth.jwt()->>'sub')
  and (select auth.jwt()->>'iss') = 'https://securetoken.google.com/chatpulse-35264'
  and (select auth.jwt()->>'aud') = 'chatpulse-35264'
)
with check (
  bucket_id = 'chatpulse-avatars'
  and (storage.foldername(name))[2] = (select auth.jwt()->>'sub')
  and (select auth.jwt()->>'iss') = 'https://securetoken.google.com/chatpulse-35264'
  and (select auth.jwt()->>'aud') = 'chatpulse-35264'
);

drop policy if exists "ChatPulse users delete their own avatars" on storage.objects;
create policy "ChatPulse users delete their own avatars"
on storage.objects
for delete
to public
using (
  bucket_id = 'chatpulse-avatars'
  and (storage.foldername(name))[2] = (select auth.jwt()->>'sub')
  and (select auth.jwt()->>'iss') = 'https://securetoken.google.com/chatpulse-35264'
  and (select auth.jwt()->>'aud') = 'chatpulse-35264'
);

drop policy if exists "ChatPulse conversation participants read attachments" on storage.objects;
create policy "ChatPulse conversation participants read attachments"
on storage.objects
for select
to public
using (
  bucket_id = 'chatpulse-files'
  and (storage.foldername(name))[1] = 'attachments'
  and (select auth.jwt()->>'sub') in (
    (storage.foldername(name))[2],
    (storage.foldername(name))[3]
  )
  and (select auth.jwt()->>'iss') = 'https://securetoken.google.com/chatpulse-35264'
  and (select auth.jwt()->>'aud') = 'chatpulse-35264'
);

drop policy if exists "ChatPulse users upload conversation attachments" on storage.objects;
create policy "ChatPulse users upload conversation attachments"
on storage.objects
for insert
to public
with check (
  bucket_id = 'chatpulse-files'
  and (storage.foldername(name))[1] = 'attachments'
  and (select auth.jwt()->>'sub') in (
    (storage.foldername(name))[2],
    (storage.foldername(name))[3]
  )
  and (select auth.jwt()->>'iss') = 'https://securetoken.google.com/chatpulse-35264'
  and (select auth.jwt()->>'aud') = 'chatpulse-35264'
);

drop policy if exists "ChatPulse users delete conversation attachments" on storage.objects;
create policy "ChatPulse users delete conversation attachments"
on storage.objects
for delete
to public
using (
  bucket_id = 'chatpulse-files'
  and (storage.foldername(name))[1] = 'attachments'
  and (select auth.jwt()->>'sub') in (
    (storage.foldername(name))[2],
    (storage.foldername(name))[3]
  )
  and (select auth.jwt()->>'iss') = 'https://securetoken.google.com/chatpulse-35264'
  and (select auth.jwt()->>'aud') = 'chatpulse-35264'
);
