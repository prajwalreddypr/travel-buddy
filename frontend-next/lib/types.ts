export interface User {
  id: number
  email: string
  full_name: string | null
  phone: string | null
  address: string | null
  countries_visited: number | null
  passport_nationality: string | null
  home_city: string | null
  has_schengen_visa: boolean | null
  has_us_visa: boolean | null
  travel_style: 'budget' | 'mid' | 'luxury' | null
  budget_eur: number | null
}
