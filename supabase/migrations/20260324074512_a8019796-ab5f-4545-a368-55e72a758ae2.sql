
CREATE POLICY "Admins can update artisan_profiles"
ON public.artisan_profiles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
