export interface IndianCity {
  city: string;
  state: string;
}

/** Curated Indian city list used by the onboarding autocomplete. */
export const INDIAN_CITIES: readonly IndianCity[] = [
  { city: "New Delhi", state: "Delhi" },
  { city: "Mumbai", state: "Maharashtra" },
  { city: "Bengaluru", state: "Karnataka" },
  { city: "Hyderabad", state: "Telangana" },
  { city: "Chennai", state: "Tamil Nadu" },
  { city: "Kolkata", state: "West Bengal" },
  { city: "Pune", state: "Maharashtra" },
  { city: "Ahmedabad", state: "Gujarat" },
  { city: "Jaipur", state: "Rajasthan" },
  { city: "Udaipur", state: "Rajasthan" },
  { city: "Jodhpur", state: "Rajasthan" },
  { city: "Jaisalmer", state: "Rajasthan" },
  { city: "Surat", state: "Gujarat" },
  { city: "Vadodara", state: "Gujarat" },
  { city: "Rajkot", state: "Gujarat" },
  { city: "Lucknow", state: "Uttar Pradesh" },
  { city: "Kanpur", state: "Uttar Pradesh" },
  { city: "Agra", state: "Uttar Pradesh" },
  { city: "Varanasi", state: "Uttar Pradesh" },
  { city: "Prayagraj", state: "Uttar Pradesh" },
  { city: "Noida", state: "Uttar Pradesh" },
  { city: "Ghaziabad", state: "Uttar Pradesh" },
  { city: "Meerut", state: "Uttar Pradesh" },
  { city: "Gurugram", state: "Haryana" },
  { city: "Faridabad", state: "Haryana" },
  { city: "Chandigarh", state: "Chandigarh" },
  { city: "Amritsar", state: "Punjab" },
  { city: "Ludhiana", state: "Punjab" },
  { city: "Jalandhar", state: "Punjab" },
  { city: "Dehradun", state: "Uttarakhand" },
  { city: "Rishikesh", state: "Uttarakhand" },
  { city: "Haridwar", state: "Uttarakhand" },
  { city: "Nainital", state: "Uttarakhand" },
  { city: "Shimla", state: "Himachal Pradesh" },
  { city: "Manali", state: "Himachal Pradesh" },
  { city: "Dharamshala", state: "Himachal Pradesh" },
  { city: "Srinagar", state: "Jammu and Kashmir" },
  { city: "Jammu", state: "Jammu and Kashmir" },
  { city: "Leh", state: "Ladakh" },
  { city: "Bhopal", state: "Madhya Pradesh" },
  { city: "Indore", state: "Madhya Pradesh" },
  { city: "Gwalior", state: "Madhya Pradesh" },
  { city: "Ujjain", state: "Madhya Pradesh" },
  { city: "Khajuraho", state: "Madhya Pradesh" },
  { city: "Nagpur", state: "Maharashtra" },
  { city: "Nashik", state: "Maharashtra" },
  { city: "Aurangabad", state: "Maharashtra" },
  { city: "Kolhapur", state: "Maharashtra" },
  { city: "Lonavala", state: "Maharashtra" },
  { city: "Mahabaleshwar", state: "Maharashtra" },
  { city: "Panaji", state: "Goa" },
  { city: "Margao", state: "Goa" },
  { city: "Calangute", state: "Goa" },
  { city: "Mangaluru", state: "Karnataka" },
  { city: "Mysuru", state: "Karnataka" },
  { city: "Hampi", state: "Karnataka" },
  { city: "Madikeri", state: "Karnataka" },
  { city: "Hubballi", state: "Karnataka" },
  { city: "Kochi", state: "Kerala" },
  { city: "Thiruvananthapuram", state: "Kerala" },
  { city: "Munnar", state: "Kerala" },
  { city: "Alappuzha", state: "Kerala" },
  { city: "Kozhikode", state: "Kerala" },
  { city: "Thrissur", state: "Kerala" },
  { city: "Coimbatore", state: "Tamil Nadu" },
  { city: "Madurai", state: "Tamil Nadu" },
  { city: "Ooty", state: "Tamil Nadu" },
  { city: "Tiruchirappalli", state: "Tamil Nadu" },
  { city: "Puducherry", state: "Puducherry" },
  { city: "Visakhapatnam", state: "Andhra Pradesh" },
  { city: "Vijayawada", state: "Andhra Pradesh" },
  { city: "Tirupati", state: "Andhra Pradesh" },
  { city: "Bhubaneswar", state: "Odisha" },
  { city: "Puri", state: "Odisha" },
  { city: "Cuttack", state: "Odisha" },
  { city: "Patna", state: "Bihar" },
  { city: "Gaya", state: "Bihar" },
  { city: "Ranchi", state: "Jharkhand" },
  { city: "Jamshedpur", state: "Jharkhand" },
  { city: "Raipur", state: "Chhattisgarh" },
  { city: "Guwahati", state: "Assam" },
  { city: "Shillong", state: "Meghalaya" },
  { city: "Imphal", state: "Manipur" },
  { city: "Aizawl", state: "Mizoram" },
  { city: "Kohima", state: "Nagaland" },
  { city: "Agartala", state: "Tripura" },
  { city: "Itanagar", state: "Arunachal Pradesh" },
  { city: "Gangtok", state: "Sikkim" },
  { city: "Siliguri", state: "West Bengal" },
  { city: "Darjeeling", state: "West Bengal" },
  { city: "Durgapur", state: "West Bengal" },
  { city: "Port Blair", state: "Andaman and Nicobar Islands" },
];

export function searchIndianCities(query: string, limit = 6): IndianCity[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return INDIAN_CITIES.slice(0, limit);
  const starts: IndianCity[] = [];
  const contains: IndianCity[] = [];
  for (const item of INDIAN_CITIES) {
    const haystack = `${item.city} ${item.state}`.toLowerCase();
    if (item.city.toLowerCase().startsWith(normalized)) starts.push(item);
    else if (haystack.includes(normalized)) contains.push(item);
    if (starts.length >= limit) break;
  }
  return [...starts, ...contains].slice(0, limit);
}

export function formatIndianCity(item: IndianCity): string {
  return `${item.city}, ${item.state}`;
}
