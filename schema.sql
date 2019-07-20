CREATE DATABASE db;

\connect db

--
-- Name: user_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.user_id_seq OWNER TO postgres;

SET default_tablespace = '';

SET default_with_oids = false;

--
-- Name: user; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."user" (
    id bigint DEFAULT nextval('public.user_id_seq'::regclass) NOT NULL,
    "user" character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    status character varying(1) NOT NULL,
    CONSTRAINT pk_user PRIMARY KEY (id)
);


ALTER TABLE public."user" OWNER TO postgres;

--
-- Data for Name: user; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."user" (id, "user", password, status) FROM stdin;
1	vancliff	vancliff	A
2	mediv	mediv	A
3	prueba	prueba	A
\.


--
-- Name: user_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_id_seq', 3, true);
