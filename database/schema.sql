-- ============================================================
-- farm-marketplace (Metsätorvi) — database schema
-- Exported from Supabase on 2026-10-17 with:
--   pg_dump "<DATABASE_URL>" --schema-only --schema=public --no-owner --no-privileges
-- PostgreSQL 17 (Supabase)
--
-- This file DOCUMENTS the live database (tables, views, functions,
-- triggers, RLS policies in the public schema). No data is included.
--
-- Not included: extensions (e.g. PostGIS), Supabase's own schemas
-- (auth, storage), storage buckets, edge functions (see supabase/functions),
-- triggers on auth.users.
--
-- Changes to the live database: add a dated file to database/migrations/
-- and re-export this file afterwards.
-- ============================================================

--
-- PostgreSQL database dump
--

\restrict Wyei8xNTRagdyVDDvknZ4rNU8RXbzhIkcQhCkCfzrbpTD6xkFaUPlig4DW3HqKb

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.11

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: application_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.application_status AS ENUM (
    'pending',
    'accepted',
    'rejected',
    'withdrawn'
);


--
-- Name: booking_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.booking_status AS ENUM (
    'pending',
    'confirmed',
    'cancelled'
);


--
-- Name: forest_product_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.forest_product_type AS ENUM (
    'marjat',
    'sienet',
    'muut'
);


--
-- Name: forest_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.forest_status AS ENUM (
    'active',
    'sold',
    'expired',
    'draft'
);


--
-- Name: forest_unit; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.forest_unit AS ENUM (
    'kg',
    'litre',
    'piece'
);


--
-- Name: listing_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.listing_status AS ENUM (
    'active',
    'closed',
    'draft',
    'expired'
);


--
-- Name: listing_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.listing_type AS ENUM (
    'itsepoiminta',
    'kausityo'
);


--
-- Name: price_unit; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.price_unit AS ENUM (
    'kg',
    'h',
    'day',
    'piece',
    'litre'
);


--
-- Name: contacts_lock_fields_on_read(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.contacts_lock_fields_on_read() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if new.message is distinct from old.message
     or new.sender_id is distinct from old.sender_id
     or new.sender_email is distinct from old.sender_email
     or new.sender_name is distinct from old.sender_name
     or new.receiver_id is distinct from old.receiver_id
  then
    raise exception 'Only is_read can be updated';
  end if;
  return new;
end;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  insert into public.profiles (id, full_name, phone, is_farmer, is_collector)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'phone',
    coalesce((new.raw_user_meta_data->>'is_farmer')::boolean, false),
    coalesce((new.raw_user_meta_data->>'is_collector')::boolean, false)
  );
  return new;
end;
$$;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


--
-- Name: update_profile_rating(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_profile_rating() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
begin
  update public.profiles
  set
    rating = (
      select round(avg(rating)::numeric, 2)
      from public.reviews
      where reviewee_id = coalesce(new.reviewee_id, old.reviewee_id)
    ),
    review_count = (
      select count(*)
      from public.reviews
      where reviewee_id = coalesce(new.reviewee_id, old.reviewee_id)
    )
  where id = coalesce(new.reviewee_id, old.reviewee_id);
  return new;
end;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.applications (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    listing_id uuid NOT NULL,
    applicant_id uuid NOT NULL,
    status public.application_status DEFAULT 'pending'::public.application_status NOT NULL,
    message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    rejection_reason text,
    farmer_read_at timestamp with time zone,
    applicant_read_at timestamp with time zone,
    farmer_archived_at timestamp with time zone,
    applicant_archived_at timestamp with time zone
);


--
-- Name: bookings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bookings (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    listing_id uuid NOT NULL,
    booker_id uuid NOT NULL,
    status public.booking_status DEFAULT 'pending'::public.booking_status NOT NULL,
    booking_date date NOT NULL,
    party_size integer DEFAULT 1 NOT NULL,
    message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    rejection_reason text,
    farmer_read_at timestamp with time zone,
    booker_read_at timestamp with time zone,
    farmer_archived_at timestamp with time zone,
    booker_archived_at timestamp with time zone
);


--
-- Name: contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contacts (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    forest_listing_id uuid,
    farm_listing_id uuid,
    sender_id uuid,
    receiver_id uuid NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    sender_name text,
    sender_email text,
    CONSTRAINT contacts_sender_identity_check CHECK (((sender_id IS NOT NULL) OR ((sender_name IS NOT NULL) AND (sender_email IS NOT NULL)))),
    CONSTRAINT no_self_contact CHECK ((sender_id <> receiver_id)),
    CONSTRAINT one_listing CHECK ((((forest_listing_id IS NOT NULL) AND (farm_listing_id IS NULL)) OR ((forest_listing_id IS NULL) AND (farm_listing_id IS NOT NULL))))
);


--
-- Name: farm_listings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.farm_listings (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    farm_id uuid NOT NULL,
    owner_id uuid NOT NULL,
    type public.listing_type NOT NULL,
    status public.listing_status DEFAULT 'active'::public.listing_status NOT NULL,
    title text NOT NULL,
    description text,
    crop_type text,
    price numeric(8,2) NOT NULL,
    price_unit public.price_unit NOT NULL,
    date_start date NOT NULL,
    date_end date NOT NULL,
    spots_total integer,
    spots_remaining integer,
    booking_required boolean DEFAULT true NOT NULL,
    accommodation boolean DEFAULT false NOT NULL,
    meals_included boolean DEFAULT false NOT NULL,
    transport boolean DEFAULT false NOT NULL,
    meal_allowance boolean DEFAULT false NOT NULL,
    contract_based boolean DEFAULT false NOT NULL,
    machine_work boolean DEFAULT false NOT NULL,
    view_count integer DEFAULT 0 NOT NULL,
    contact_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dates_valid CHECK ((date_end >= date_start)),
    CONSTRAINT price_positive CHECK ((price > (0)::numeric)),
    CONSTRAINT spots_valid CHECK ((spots_remaining <= spots_total))
);


--
-- Name: farms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.farms (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    owner_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    city text NOT NULL,
    region text NOT NULL,
    address text,
    location public.geography(Point,4326),
    is_organic boolean DEFAULT false NOT NULL,
    is_accessible boolean DEFAULT false NOT NULL,
    family_friendly boolean DEFAULT false NOT NULL,
    dogs_allowed boolean DEFAULT false NOT NULL,
    rating numeric(3,2) DEFAULT 0,
    review_count integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    full_name text NOT NULL,
    phone text,
    avatar_url text,
    city text,
    region text,
    location public.geography(Point,4326),
    is_farmer boolean DEFAULT false NOT NULL,
    is_collector boolean DEFAULT false NOT NULL,
    phone_verified boolean DEFAULT false NOT NULL,
    identity_verified boolean DEFAULT false NOT NULL,
    food_licence boolean DEFAULT false NOT NULL,
    rating numeric(3,2) DEFAULT 0,
    review_count integer DEFAULT 0 NOT NULL,
    total_sales_eur numeric(10,2) DEFAULT 0 NOT NULL,
    preferred_lang text DEFAULT 'fi'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT profiles_preferred_lang_check CHECK ((preferred_lang = ANY (ARRAY['fi'::text, 'en'::text])))
);


--
-- Name: farm_listings_full; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.farm_listings_full AS
 SELECT fl.id,
    fl.farm_id,
    fl.owner_id,
    fl.type,
    fl.status,
    fl.title,
    fl.description,
    fl.crop_type,
    fl.price,
    fl.price_unit,
    fl.date_start,
    fl.date_end,
    fl.spots_total,
    fl.spots_remaining,
    fl.booking_required,
    fl.accommodation,
    fl.meals_included,
    fl.transport,
    fl.meal_allowance,
    fl.contract_based,
    fl.machine_work,
    fl.view_count,
    fl.contact_count,
    fl.created_at,
    fl.updated_at,
    f.name AS farm_name,
    f.description AS farm_description,
    f.city AS farm_city,
    f.region AS farm_region,
    f.address AS farm_address,
    f.location AS farm_location,
    f.is_organic,
    f.is_accessible,
    f.family_friendly,
    f.dogs_allowed,
    f.rating AS farm_rating,
    f.review_count AS farm_review_count,
    f.is_active AS farm_is_active,
    p.full_name AS owner_name,
    p.avatar_url AS owner_avatar,
    public.st_y((f.location)::public.geometry) AS lat,
    public.st_x((f.location)::public.geometry) AS lng
   FROM ((public.farm_listings fl
     LEFT JOIN public.farms f ON ((fl.farm_id = f.id)))
     LEFT JOIN public.profiles p ON ((fl.owner_id = p.id)));


--
-- Name: favourites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.favourites (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    farm_listing_id uuid,
    forest_listing_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT one_listing CHECK ((((farm_listing_id IS NOT NULL) AND (forest_listing_id IS NULL)) OR ((farm_listing_id IS NULL) AND (forest_listing_id IS NOT NULL))))
);


--
-- Name: forest_listings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.forest_listings (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    seller_id uuid NOT NULL,
    status public.forest_status DEFAULT 'active'::public.forest_status NOT NULL,
    product_type public.forest_product_type NOT NULL,
    product_name text NOT NULL,
    description text,
    quantity numeric(8,2) NOT NULL,
    unit public.forest_unit NOT NULL,
    price_per_unit numeric(8,2) NOT NULL,
    harvested_at timestamp with time zone,
    delivery_available boolean DEFAULT false NOT NULL,
    pickup_only boolean DEFAULT false NOT NULL,
    delivery_area text,
    city text NOT NULL,
    region text NOT NULL,
    location public.geography(Point,4326),
    view_count integer DEFAULT 0 NOT NULL,
    contact_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT price_positive CHECK ((price_per_unit > (0)::numeric)),
    CONSTRAINT quantity_positive CHECK ((quantity > (0)::numeric))
);


--
-- Name: listing_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.listing_images (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    farm_listing_id uuid,
    forest_listing_id uuid,
    storage_path text NOT NULL,
    url text NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT one_parent CHECK ((((farm_listing_id IS NOT NULL) AND (forest_listing_id IS NULL)) OR ((farm_listing_id IS NULL) AND (forest_listing_id IS NOT NULL))))
);


--
-- Name: forest_listings_full; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.forest_listings_full AS
 SELECT fol.id,
    fol.seller_id,
    fol.status,
    fol.product_type,
    fol.product_name,
    fol.description,
    fol.quantity,
    fol.unit,
    fol.price_per_unit,
    fol.harvested_at,
    fol.delivery_available,
    fol.pickup_only,
    fol.delivery_area,
    fol.city,
    fol.region,
    fol.location,
    fol.view_count,
    fol.contact_count,
    fol.created_at,
    fol.updated_at,
    p.full_name AS seller_name,
    p.avatar_url AS seller_avatar,
    p.rating AS seller_rating,
    p.review_count AS seller_review_count,
    p.identity_verified,
    p.food_licence,
    ((fol.harvested_at)::date = CURRENT_DATE) AS harvested_today,
    public.st_y((fol.location)::public.geometry) AS lat,
    public.st_x((fol.location)::public.geometry) AS lng,
    ( SELECT li.url
           FROM public.listing_images li
          WHERE (li.forest_listing_id = fol.id)
          ORDER BY li.is_primary DESC, li.sort_order
         LIMIT 1) AS primary_image_url
   FROM (public.forest_listings fol
     JOIN public.profiles p ON ((fol.seller_id = p.id)))
  WHERE (fol.status = 'active'::public.forest_status);


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reviews (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    reviewer_id uuid NOT NULL,
    reviewee_id uuid NOT NULL,
    farm_listing_id uuid,
    forest_listing_id uuid,
    rating integer NOT NULL,
    comment text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT no_self_review CHECK ((reviewer_id <> reviewee_id)),
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: applications applications_listing_id_applicant_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_listing_id_applicant_id_key UNIQUE (listing_id, applicant_id);


--
-- Name: applications applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_pkey PRIMARY KEY (id);


--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- Name: contacts contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_pkey PRIMARY KEY (id);


--
-- Name: farm_listings farm_listings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.farm_listings
    ADD CONSTRAINT farm_listings_pkey PRIMARY KEY (id);


--
-- Name: farms farms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.farms
    ADD CONSTRAINT farms_pkey PRIMARY KEY (id);


--
-- Name: favourites favourites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favourites
    ADD CONSTRAINT favourites_pkey PRIMARY KEY (id);


--
-- Name: favourites favourites_user_id_farm_listing_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favourites
    ADD CONSTRAINT favourites_user_id_farm_listing_id_key UNIQUE (user_id, farm_listing_id);


--
-- Name: favourites favourites_user_id_forest_listing_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favourites
    ADD CONSTRAINT favourites_user_id_forest_listing_id_key UNIQUE (user_id, forest_listing_id);


--
-- Name: forest_listings forest_listings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forest_listings
    ADD CONSTRAINT forest_listings_pkey PRIMARY KEY (id);


--
-- Name: listing_images listing_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listing_images
    ADD CONSTRAINT listing_images_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_reviewer_id_reviewee_id_farm_listing_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_reviewer_id_reviewee_id_farm_listing_id_key UNIQUE (reviewer_id, reviewee_id, farm_listing_id);


--
-- Name: reviews reviews_reviewer_id_reviewee_id_forest_listing_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_reviewer_id_reviewee_id_forest_listing_id_key UNIQUE (reviewer_id, reviewee_id, forest_listing_id);


--
-- Name: applications_applicant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX applications_applicant ON public.applications USING btree (applicant_id);


--
-- Name: applications_applicant_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX applications_applicant_status_idx ON public.applications USING btree (applicant_id, status);


--
-- Name: applications_listing; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX applications_listing ON public.applications USING btree (listing_id);


--
-- Name: applications_listing_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX applications_listing_status_idx ON public.applications USING btree (listing_id, status);


--
-- Name: bookings_booker; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bookings_booker ON public.bookings USING btree (booker_id);


--
-- Name: bookings_booker_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bookings_booker_status_idx ON public.bookings USING btree (booker_id, status);


--
-- Name: bookings_listing; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bookings_listing ON public.bookings USING btree (listing_id);


--
-- Name: bookings_listing_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bookings_listing_status_idx ON public.bookings USING btree (listing_id, status);


--
-- Name: contacts_receiver; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX contacts_receiver ON public.contacts USING btree (receiver_id, is_read);


--
-- Name: contacts_sender; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX contacts_sender ON public.contacts USING btree (sender_id);


--
-- Name: farm_listings_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX farm_listings_dates ON public.farm_listings USING btree (date_start, date_end);


--
-- Name: farm_listings_farm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX farm_listings_farm ON public.farm_listings USING btree (farm_id);


--
-- Name: farm_listings_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX farm_listings_owner ON public.farm_listings USING btree (owner_id);


--
-- Name: farm_listings_type_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX farm_listings_type_status ON public.farm_listings USING btree (type, status);


--
-- Name: farms_one_per_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX farms_one_per_owner ON public.farms USING btree (owner_id);


--
-- Name: favourites_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX favourites_user ON public.favourites USING btree (user_id);


--
-- Name: forest_listings_harvested; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX forest_listings_harvested ON public.forest_listings USING btree (harvested_at);


--
-- Name: forest_listings_seller; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX forest_listings_seller ON public.forest_listings USING btree (seller_id);


--
-- Name: forest_listings_type_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX forest_listings_type_status ON public.forest_listings USING btree (product_type, status);


--
-- Name: listing_images_farm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX listing_images_farm ON public.listing_images USING btree (farm_listing_id);


--
-- Name: listing_images_forest; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX listing_images_forest ON public.listing_images USING btree (forest_listing_id);


--
-- Name: reviews_reviewee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reviews_reviewee ON public.reviews USING btree (reviewee_id);


--
-- Name: applications applications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER applications_updated_at BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: bookings bookings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: contacts contacts_lock_fields_on_read_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER contacts_lock_fields_on_read_trigger BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.contacts_lock_fields_on_read();


--
-- Name: farm_listings farm_listings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER farm_listings_updated_at BEFORE UPDATE ON public.farm_listings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: farms farms_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER farms_updated_at BEFORE UPDATE ON public.farms FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: forest_listings forest_listings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER forest_listings_updated_at BEFORE UPDATE ON public.forest_listings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: profiles profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: reviews reviews_update_rating; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER reviews_update_rating AFTER INSERT OR DELETE OR UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.update_profile_rating();


--
-- Name: applications applications_applicant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_applicant_id_fkey FOREIGN KEY (applicant_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: applications applications_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.farm_listings(id) ON DELETE CASCADE;


--
-- Name: bookings bookings_booker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_booker_id_fkey FOREIGN KEY (booker_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: bookings bookings_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.farm_listings(id) ON DELETE CASCADE;


--
-- Name: contacts contacts_farm_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_farm_listing_id_fkey FOREIGN KEY (farm_listing_id) REFERENCES public.farm_listings(id) ON DELETE CASCADE;


--
-- Name: contacts contacts_forest_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_forest_listing_id_fkey FOREIGN KEY (forest_listing_id) REFERENCES public.forest_listings(id) ON DELETE CASCADE;


--
-- Name: contacts contacts_receiver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: contacts contacts_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: farm_listings farm_listings_farm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.farm_listings
    ADD CONSTRAINT farm_listings_farm_id_fkey FOREIGN KEY (farm_id) REFERENCES public.farms(id) ON DELETE CASCADE;


--
-- Name: farm_listings farm_listings_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.farm_listings
    ADD CONSTRAINT farm_listings_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: farms farms_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.farms
    ADD CONSTRAINT farms_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: favourites favourites_farm_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favourites
    ADD CONSTRAINT favourites_farm_listing_id_fkey FOREIGN KEY (farm_listing_id) REFERENCES public.farm_listings(id) ON DELETE CASCADE;


--
-- Name: favourites favourites_forest_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favourites
    ADD CONSTRAINT favourites_forest_listing_id_fkey FOREIGN KEY (forest_listing_id) REFERENCES public.forest_listings(id) ON DELETE CASCADE;


--
-- Name: favourites favourites_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favourites
    ADD CONSTRAINT favourites_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: forest_listings forest_listings_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forest_listings
    ADD CONSTRAINT forest_listings_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: listing_images listing_images_farm_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listing_images
    ADD CONSTRAINT listing_images_farm_listing_id_fkey FOREIGN KEY (farm_listing_id) REFERENCES public.farm_listings(id) ON DELETE CASCADE;


--
-- Name: listing_images listing_images_forest_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listing_images
    ADD CONSTRAINT listing_images_forest_listing_id_fkey FOREIGN KEY (forest_listing_id) REFERENCES public.forest_listings(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_farm_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_farm_listing_id_fkey FOREIGN KEY (farm_listing_id) REFERENCES public.farm_listings(id) ON DELETE SET NULL;


--
-- Name: reviews reviews_forest_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_forest_listing_id_fkey FOREIGN KEY (forest_listing_id) REFERENCES public.forest_listings(id) ON DELETE SET NULL;


--
-- Name: reviews reviews_reviewee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_reviewee_id_fkey FOREIGN KEY (reviewee_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: contacts Receivers can mark as read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Receivers can mark as read" ON public.contacts FOR UPDATE TO authenticated USING ((receiver_id = auth.uid())) WITH CHECK (((receiver_id = auth.uid()) AND (is_read = true)));


--
-- Name: contacts Receivers can read their messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Receivers can read their messages" ON public.contacts FOR SELECT TO authenticated USING ((receiver_id = auth.uid()));


--
-- Name: contacts Senders can read their sent messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Senders can read their sent messages" ON public.contacts FOR SELECT TO authenticated USING ((sender_id = auth.uid()));


--
-- Name: applications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

--
-- Name: applications applications: applicant insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "applications: applicant insert" ON public.applications FOR INSERT WITH CHECK ((auth.uid() = applicant_id));


--
-- Name: applications applications: applicant read own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "applications: applicant read own" ON public.applications FOR SELECT USING (((auth.uid() = applicant_id) OR (auth.uid() IN ( SELECT farm_listings.owner_id
   FROM public.farm_listings
  WHERE (farm_listings.id = applications.listing_id)))));


--
-- Name: applications applications: applicant withdraw; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "applications: applicant withdraw" ON public.applications FOR UPDATE USING ((auth.uid() = applicant_id)) WITH CHECK ((status = 'withdrawn'::public.application_status));


--
-- Name: applications applications: farmer respond; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "applications: farmer respond" ON public.applications FOR UPDATE USING ((auth.uid() IN ( SELECT farm_listings.owner_id
   FROM public.farm_listings
  WHERE (farm_listings.id = applications.listing_id))));


--
-- Name: bookings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

--
-- Name: bookings bookings: authenticated insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "bookings: authenticated insert" ON public.bookings FOR INSERT WITH CHECK ((auth.uid() = booker_id));


--
-- Name: bookings bookings: booker read own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "bookings: booker read own" ON public.bookings FOR SELECT USING (((auth.uid() = booker_id) OR (auth.uid() IN ( SELECT farm_listings.owner_id
   FROM public.farm_listings
  WHERE (farm_listings.id = bookings.listing_id)))));


--
-- Name: bookings bookings: owner update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "bookings: owner update" ON public.bookings FOR UPDATE USING (((auth.uid() = booker_id) OR (auth.uid() IN ( SELECT farm_listings.owner_id
   FROM public.farm_listings
  WHERE (farm_listings.id = bookings.listing_id)))));


--
-- Name: contacts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

--
-- Name: farm_listings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.farm_listings ENABLE ROW LEVEL SECURITY;

--
-- Name: farm_listings farm_listings: owner all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "farm_listings: owner all" ON public.farm_listings USING ((auth.uid() = owner_id));


--
-- Name: farm_listings farm_listings: public read active; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "farm_listings: public read active" ON public.farm_listings FOR SELECT USING ((status = 'active'::public.listing_status));


--
-- Name: farms; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;

--
-- Name: farms farms: owner all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "farms: owner all" ON public.farms USING ((auth.uid() = owner_id));


--
-- Name: farms farms: public read active; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "farms: public read active" ON public.farms FOR SELECT USING ((is_active = true));


--
-- Name: favourites; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.favourites ENABLE ROW LEVEL SECURITY;

--
-- Name: favourites favourites: owner all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "favourites: owner all" ON public.favourites USING ((auth.uid() = user_id));


--
-- Name: forest_listings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.forest_listings ENABLE ROW LEVEL SECURITY;

--
-- Name: forest_listings forest_listings: owner all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "forest_listings: owner all" ON public.forest_listings USING ((auth.uid() = seller_id));


--
-- Name: forest_listings forest_listings: public read active; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "forest_listings: public read active" ON public.forest_listings FOR SELECT USING ((status = 'active'::public.forest_status));


--
-- Name: listing_images; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.listing_images ENABLE ROW LEVEL SECURITY;

--
-- Name: listing_images listing_images: authenticated insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "listing_images: authenticated insert" ON public.listing_images FOR INSERT WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: listing_images listing_images: owner delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "listing_images: owner delete" ON public.listing_images FOR DELETE USING ((auth.uid() IN ( SELECT farm_listings.owner_id
   FROM public.farm_listings
  WHERE (farm_listings.id = listing_images.farm_listing_id)
UNION
 SELECT forest_listings.seller_id
   FROM public.forest_listings
  WHERE (forest_listings.id = listing_images.forest_listing_id))));


--
-- Name: listing_images listing_images: public read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "listing_images: public read" ON public.listing_images FOR SELECT USING (true);


--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles profiles: owner update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "profiles: owner update" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: profiles profiles: public read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "profiles: public read" ON public.profiles FOR SELECT USING (true);


--
-- Name: reviews; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: reviews reviews: authenticated insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "reviews: authenticated insert" ON public.reviews FOR INSERT WITH CHECK ((auth.uid() = reviewer_id));


--
-- Name: reviews reviews: public read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "reviews: public read" ON public.reviews FOR SELECT USING (true);


--
-- Name: reviews reviews: reviewer update own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "reviews: reviewer update own" ON public.reviews FOR UPDATE USING ((auth.uid() = reviewer_id));


--
-- PostgreSQL database dump complete
--

\unrestrict Wyei8xNTRagdyVDDvknZ4rNU8RXbzhIkcQhCkCfzrbpTD6xkFaUPlig4DW3HqKb

