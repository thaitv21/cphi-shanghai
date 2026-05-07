export type CphiJsonValue =
  | string
  | number
  | boolean
  | null
  | CphiJsonValue[]
  | { [key: string]: CphiJsonValue };

export type Nullable<T> = T | null;

export type CphiPaginationLink = {
  url: Nullable<string>;
  label: string;
  active: boolean;
};

export type CphiPaginatedData<TItem> = {
  current_page: number;
  data: TItem[];
  first_page_url: string;
  from: Nullable<number>;
  last_page: number;
  last_page_url: string;
  links: CphiPaginationLink[];
  next_page_url: Nullable<string>;
  path: string;
  per_page: number;
  prev_page_url: Nullable<string>;
  to: Nullable<number>;
  total: number;
};

export type CphiCompany = {
  id: number;
  lang: number;
  main: number;
  master_id: number;
  site: number;
  member_id: number;
  company_user_code: string;
  company_name: string;
  company_name_en: string;
  company_telephone: Nullable<string>;
  logo_pic: string;
  main_pic: string[];
  detail_pic: string[];
  banner_pic: string[];
  country: Nullable<string>;
  country_id: Nullable<number>;
  province: Nullable<string>;
  province_id: Nullable<number>;
  city: Nullable<string>;
  city_id: Nullable<number>;
  detail_address: Nullable<string>;
  full_address: Nullable<string>;
  business_scope: string[];
  contactor_name: Nullable<string>;
  contactor_phone: Nullable<string>;
  position: Nullable<string>;
  web_site: Nullable<string>;
  employee_no: Nullable<string>;
  year: Nullable<string>;
  introduction: Nullable<string>;
  website_url: string;
  info_approve_status: number;
  score: number;
  hit_count: number;
  is_cloud: number;
  shop_status: number;
  service_status: number;
  business_type: string[];
  main_sales_market: string[];
  delivery_type: string[];
  pay_type: string[];
  pay_currency: string[];
  factory_country: Nullable<string>;
  factory_province: Nullable<string>;
  factory_city: Nullable<string>;
  contract_name: Nullable<string>;
  contract_name_en: Nullable<string>;
  en_id: Nullable<number>;
  info_approve_status_text: Nullable<string>;
  info_shop_status_text: Nullable<string>;
  created_at: Nullable<string>;
  updated_at: Nullable<string>;
  deleted_at: Nullable<string>;
  [key: string]: CphiJsonValue;
};

export type CphiExhibitor = {
  id: number;
  site: number;
  exhibition_id: number;
  exhibition_name: Nullable<string>;
  member_id: number;
  company_id: number;
  booth_no: Nullable<string>;
  hall_no: Nullable<string>;
  exhibition_area_classification_id: Nullable<string>;
  exhibition_area_classification_name: Nullable<string>;
  exhibition_area_classification_name_en: Nullable<string>;
  emanual_category: Nullable<string>;
  booth_area: number;
  cbklistsale: Nullable<string>;
  cbklistsale_ids: Nullable<string>;
  booth_category: number;
  emanual_e_id: Nullable<number>;
  emanual_push: number;
  emanual_push_at: Nullable<string>;
  emanual_push_errmsg: Nullable<string>;
  extra_card_quantity: number;
  show_en_name: number;
  deleted_at: Nullable<string>;
  created_at: string;
  created_by: Nullable<string>;
  updated_at: Nullable<string>;
  updated_by: Nullable<string>;
  zhanshang_cn_company: Nullable<string>;
  zhanshang_en_company: Nullable<string>;
  company_logo: Nullable<string>;
  en_id: Nullable<number>;
  is_top: number;
  can_scan: number;
  view_count: Nullable<number>;
  country: Nullable<string>;
  opportunity: number;
  cc_company_name: Nullable<string>;
  cc_company_name_en: Nullable<string>;
  cate: Nullable<string>;
  cate_en: Nullable<string>;
  homepage: Nullable<string>;
  homepage_en: Nullable<string>;
  country_en: Nullable<string>;
  company: CphiCompany;
};

export type CphiIndexResponse = {
  count: number;
  limit: string;
  page: string;
  data: CphiPaginatedData<CphiExhibitor>;
};

export type ExhibitorCrawlerInput = {
  page?: number;
  limit?: number;
};

export type ExhibitorCrawlerResult = {
  page: number;
  limit: number;
  total: number;
  lastPage: number;
  saved: number;
  exhibitors: CphiExhibitor[];
};
