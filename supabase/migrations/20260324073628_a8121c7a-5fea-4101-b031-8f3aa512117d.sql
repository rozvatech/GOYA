
-- Admin can view ALL jobs (not just own)
CREATE POLICY "Admins can view all jobs"
ON public.jobs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can delete jobs
CREATE POLICY "Admins can delete jobs"
ON public.jobs FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can delete profiles
CREATE POLICY "Admins can delete profiles"
ON public.profiles FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can delete artisan_profiles
CREATE POLICY "Admins can delete artisan_profiles"
ON public.artisan_profiles FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can delete reviews
CREATE POLICY "Admins can delete reviews"
ON public.reviews FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can delete user_roles
CREATE POLICY "Admins can delete user_roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can delete messages
CREATE POLICY "Admins can delete messages"
ON public.messages FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
