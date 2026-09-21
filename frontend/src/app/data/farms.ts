export interface Farm {
  id: number | string;
  title?: string;
  name: string;
  location_fi: string;
  location_en: string;
  city: string;
  region_fi: string;
  region_en: string;
  type: "picking" | "job";
  produce_fi: string;
  produce_en: string;
  price: string;
  unit: string;
  dateStart: string;
  dateEnd: string;
  // ISO-formatted season window for the calendar
  seasonStart: string; // "2025-06-20"
  seasonEnd: string;   // "2025-07-15"
  rating: number;
  reviews: number;
  image: string;
  galleryImages: string[];
  distance: string;
  openSpots: number;
  tags_fi: string[];
  tags_en: string[];
  description_fi: string;
  description_en: string;
  // Job-specific
  contractType_fi?: string;
  contractType_en?: string;
  workingHours_fi?: string;
  workingHours_en?: string;
  // Host
  hostName: string;
  hostId: string;
  hostInitials: string;
  hostMemberSince_fi: string;
  hostMemberSince_en: string;
  hostRating: number;
  hostReviews: number;
}

// export const farms: Farm[] = [
//   {
//     id: 1,
//     name: "Virtanen Tila",
//     location_fi: "Hämeenlinna, Kanta-Häme",
//     location_en: "Hämeenlinna, Kanta-Häme",
//     city: "Hämeenlinna",
//     region_fi: "Kanta-Häme",
//     region_en: "Kanta-Häme",
//     type: "picking",
//     produce_fi: "Mansikat",
//     produce_en: "Strawberries",
//     price: "4.50",
//     unit: "kg",
//     dateStart: "20.6.",
//     dateEnd: "15.7.",
//     seasonStart: "2025-06-20",
//     seasonEnd: "2025-07-15",
//     rating: 4.8,
//     reviews: 42,
//     image: "https://images.unsplash.com/photo-1734313237433-9b0ecafc2d42?w=900&h=520&fit=crop&auto=format",
//     galleryImages: [
//       "https://images.unsplash.com/photo-1593895349007-8e6700308b3d?w=400&h=260&fit=crop&auto=format",
//       "https://images.unsplash.com/photo-1734313237467-1f93eb3abbe0?w=400&h=260&fit=crop&auto=format",
//       "https://images.unsplash.com/photo-1488650989610-0d7e27dc293c?w=400&h=260&fit=crop&auto=format",
//     ],
//     distance: "12 km",
//     openSpots: 18,
//     tags_fi: ["Sopii perheille", "Parkkipaikka", "Esteettömyys", "Luomu"],
//     tags_en: ["Family-friendly", "Parking", "Accessible", "Organic"],
//     description_fi: "Virtasen Tila on perheyritys, joka on kasvattanut mansikoita Hämeenlinnassa jo kolmen sukupolven ajan. Tilallamme on yli 2 hehtaaria mansikkarivejä, jotka avautuvat itsepoimintaan joka kesä kesäkuun lopusta heinäkuun puoliväliin.\n\nPoiminnat tapahtuvat aamupäivisin klo 8–13. Meillä on tilava parkkialue, lasten leikkipaikka sekä pieni kahvila, jossa voi nauttia tuoretta mansikkamehua. Koirat ovat tervetulleita talutushihnassa.",
//     description_en: "Virtanen Farm is a family business that has been growing strawberries in Hämeenlinna for three generations. Our farm has over 2 hectares of strawberry rows open for self-picking each summer from late June to mid-July.\n\nPicking takes place in the mornings 8–13. We have a spacious parking area, a children's playground, and a small café serving fresh strawberry juice. Dogs welcome on a leash.",
//     hostName: "Juhani Virtanen",
//     hostInitials: "JV",
//     hostMemberSince_fi: "Toukokuu 2022",
//     hostMemberSince_en: "May 2022",
//     hostRating: 4.9,
//     hostReviews: 38,
//   },
//   {
//     id: 2,
//     name: "Korhonen Farm",
//     location_fi: "Turku, Varsinais-Suomi",
//     location_en: "Turku, Varsinais-Suomi",
//     city: "Turku",
//     region_fi: "Varsinais-Suomi",
//     region_en: "Varsinais-Suomi",
//     type: "job",
//     produce_fi: "Vadelmansato",
//     produce_en: "Raspberry harvest",
//     price: "13.50",
//     unit: "h",
//     dateStart: "1.7.",
//     dateEnd: "30.8.",
//     seasonStart: "2025-07-01",
//     seasonEnd: "2025-08-30",
//     rating: 4.6,
//     reviews: 27,
//     image: "https://images.unsplash.com/photo-1511813534717-f467cef279bf?w=900&h=520&fit=crop&auto=format",
//     galleryImages: [
//       "https://images.unsplash.com/photo-1571524188026-cc1d649962ea?w=400&h=260&fit=crop&auto=format",
//       "https://images.unsplash.com/photo-1488650989610-0d7e27dc293c?w=400&h=260&fit=crop&auto=format",
//       "https://images.unsplash.com/photo-1668090147256-10de5a40b9fe?w=400&h=260&fit=crop&auto=format",
//     ],
//     distance: "89 km",
//     openSpots: 6,
//     tags_fi: ["Majoitus järjestetty", "Ateriat sisältyvät", "Kuljetukset", "Luomu"],
//     tags_en: ["Accommodation provided", "Meals included", "Transport", "Organic"],
//     description_fi: "Korhosen tilalla on etsinnässä luotettavia kausityöntekijöitä vadelmansadon korjaamiseen kesä–elokuussa 2025. Tarjoamme kilpailukykyisen tuntipalkan, majoituksen tilan yhteydessä sekä lämpimiä aterioita päivittäin.\n\nTyöt alkavat klo 7 ja päättyvät klo 16, maanantaista perjantaihin. Kokemus marjanpoiminnasta on etu, mutta ei vaatimus — opetamme oikeat poimintatekniikat. Ilmoittautumiset ASAP, paikkoja on vain 6 jäljellä.",
//     description_en: "Korhonen Farm is looking for reliable seasonal workers for raspberry harvesting in summer–August 2025. We offer a competitive hourly wage, on-site accommodation, and hot meals daily.\n\nWork starts at 7 am and ends at 4 pm, Monday to Friday. Experience in berry picking is a bonus but not required — we'll teach the correct techniques. Apply ASAP, only 6 spots remaining.",
//     contractType_fi: "Määräaikainen työsopimus",
//     contractType_en: "Fixed-term employment contract",
//     workingHours_fi: "Ma–Pe, klo 7–16 (8 h/pv)",
//     workingHours_en: "Mon–Fri, 7 am–4 pm (8 h/day)",
//     hostName: "Eija Korhonen",
//     hostInitials: "EK",
//     hostMemberSince_fi: "Maaliskuu 2021",
//     hostMemberSince_en: "March 2021",
//     hostRating: 4.7,
//     hostReviews: 24,
//   },
//   {
//     id: 3,
//     name: "Mäkinen Mansikkatila",
//     location_fi: "Lahti, Päijät-Häme",
//     location_en: "Lahti, Päijät-Häme",
//     city: "Lahti",
//     region_fi: "Päijät-Häme",
//     region_en: "Päijät-Häme",
//     type: "picking",
//     produce_fi: "Mansikat ja vadelmat",
//     produce_en: "Strawberries & Raspberries",
//     price: "3.80",
//     unit: "kg",
//     dateStart: "28.6.",
//     dateEnd: "22.7.",
//     seasonStart: "2025-06-28",
//     seasonEnd: "2025-07-22",
//     rating: 4.9,
//     reviews: 61,
//     image: "https://images.unsplash.com/photo-1593895349007-8e6700308b3d?w=900&h=520&fit=crop&auto=format",
//     galleryImages: [
//       "https://images.unsplash.com/photo-1734313237433-9b0ecafc2d42?w=400&h=260&fit=crop&auto=format",
//       "https://images.unsplash.com/photo-1668090147256-10de5a40b9fe?w=400&h=260&fit=crop&auto=format",
//       "https://images.unsplash.com/photo-1488650989610-0d7e27dc293c?w=400&h=260&fit=crop&auto=format",
//     ],
//     distance: "34 km",
//     openSpots: 40,
//     tags_fi: ["Luomu", "Lapset tervetulleita", "Kahvila", "Parkkipaikka"],
//     tags_en: ["Organic", "Children welcome", "Café", "Parking"],
//     description_fi: "Mäkisen mansikkatila on yksi Päijät-Hämeen tunnetuimmista luomumansikan kasvattajista. Tarjoamme asiakkaillemme mahdollisuuden poimia tuoreita mansikoita ja vadelmia suoraan pelloilta.\n\nTilalla on laaja kahvila, jossa tarjoillaan mansikkatuotteita, sekä lasten leikkialue. Suosittelemme varaamaan paikan etukäteen, sillä viikonloput täyttyvät nopeasti.",
//     description_en: "Mäkinen Strawberry Farm is one of the most recognised organic strawberry growers in Päijät-Häme. We offer customers the opportunity to pick fresh strawberries and raspberries directly from the fields.\n\nThe farm has an extensive café serving strawberry products and a children's play area. We recommend reserving in advance as weekends fill up quickly.",
//     hostName: "Pekka Mäkinen",
//     hostInitials: "PM",
//     hostMemberSince_fi: "Kesäkuu 2020",
//     hostMemberSince_en: "June 2020",
//     hostRating: 4.9,
//     hostReviews: 57,
//   },
//   {
//     id: 4,
//     name: "Leinonen Puutarha",
//     location_fi: "Tampere, Pirkanmaa",
//     location_en: "Tampere, Pirkanmaa",
//     city: "Tampere",
//     region_fi: "Pirkanmaa",
//     region_en: "Pirkanmaa",
//     type: "picking",
//     produce_fi: "Karviainen ja herukat",
//     produce_en: "Gooseberries & Currants",
//     price: "5.20",
//     unit: "kg",
//     dateStart: "10.7.",
//     dateEnd: "5.8.",
//     seasonStart: "2025-07-10",
//     seasonEnd: "2025-08-05",
//     rating: 4.7,
//     reviews: 19,
//     image: "https://images.unsplash.com/photo-1734313237467-1f93eb3abbe0?w=900&h=520&fit=crop&auto=format",
//     galleryImages: [
//       "https://images.unsplash.com/photo-1597389030828-c5218bdf7fa4?w=400&h=260&fit=crop&auto=format",
//       "https://images.unsplash.com/photo-1586007173401-3821e3092abf?w=400&h=260&fit=crop&auto=format",
//       "https://images.unsplash.com/photo-1488650989610-0d7e27dc293c?w=400&h=260&fit=crop&auto=format",
//     ],
//     distance: "58 km",
//     openSpots: 12,
//     tags_fi: ["Koirat sallittu", "Parkkipaikka", "Pieni kahvio"],
//     tags_en: ["Dogs allowed", "Parking", "Small café"],
//     description_fi: "Leinosen puutarha kasvattaa karviaismarjoja ja herukoita perinteisillä menetelmillä Tampereen lähellä. Tilallamme voit poimia punaisia, valkoisia ja mustaherukoita sekä vihertäviä karviaismarjoja omaan käyttöön tai jalostukseen.\n\nTila on kodikas ja rauhallinen, sopii erinomaisesti rentouttavaksi päiväretkeksi perheelle tai ystäväporukoille.",
//     description_en: "Leinonen Garden grows gooseberries and currants using traditional methods near Tampere. At our farm you can pick red, white and blackcurrants as well as green gooseberries for home use or processing.\n\nThe farm is homely and peaceful, perfect for a relaxing day trip for families or friend groups.",
//     hostName: "Mervi Leinonen",
//     hostInitials: "ML",
//     hostMemberSince_fi: "Heinäkuu 2023",
//     hostMemberSince_en: "July 2023",
//     hostRating: 4.7,
//     hostReviews: 16,
//   },
//   {
//     id: 5,
//     name: "Heikkinen Kartano",
//     location_fi: "Seinäjoki, Etelä-Pohjanmaa",
//     location_en: "Seinäjoki, South Ostrobothnia",
//     city: "Seinäjoki",
//     region_fi: "Etelä-Pohjanmaa",
//     region_en: "South Ostrobothnia",
//     type: "job",
//     produce_fi: "Perunasato",
//     produce_en: "Potato harvest",
//     price: "14.00",
//     unit: "h",
//     dateStart: "15.8.",
//     dateEnd: "30.9.",
//     seasonStart: "2025-08-15",
//     seasonEnd: "2025-09-30",
//     rating: 4.5,
//     reviews: 33,
//     image: "https://images.unsplash.com/photo-1571524188026-cc1d649962ea?w=900&h=520&fit=crop&auto=format",
//     galleryImages: [
//       "https://images.unsplash.com/photo-1511813534717-f467cef279bf?w=400&h=260&fit=crop&auto=format",
//       "https://images.unsplash.com/photo-1668090147256-10de5a40b9fe?w=400&h=260&fit=crop&auto=format",
//       "https://images.unsplash.com/photo-1488650989610-0d7e27dc293c?w=400&h=260&fit=crop&auto=format",
//     ],
//     distance: "142 km",
//     openSpots: 15,
//     tags_fi: ["Asuminen järjestetty", "Sopimuspohjainen", "Konetyö", "Ateria-avustus"],
//     tags_en: ["Housing provided", "Contract work", "Machinery work", "Meal allowance"],
//     description_fi: "Heikkisen kartano etsii kausiluonteisia perunannostajia suurelle kartanotilalleen Seinäjoella. Työ sisältää sekä koneellista että käsin tehtävää perunankorjuuta elokuun puolivälistä syyskuun loppuun.\n\nTarjoamme majoituksen tilan vieressä sijaitsevissa työntekijäasunnoissa sekä ateria-avustuksen. Aiempi maatalouskokemus tai koneenkäyttötaito katsotaan eduksi.",
//     description_en: "Heikkinen Manor is looking for seasonal potato harvesters for its large estate in Seinäjoki. The work includes both mechanised and manual potato harvesting from mid-August to end of September.\n\nWe provide accommodation in worker apartments adjacent to the estate plus a meal allowance. Previous agricultural experience or machinery skills are considered an advantage.",
//     contractType_fi: "Kausisopimus (6 viikkoa)",
//     contractType_en: "Seasonal contract (6 weeks)",
//     workingHours_fi: "Ma–La, klo 6–15 (8 h/pv)",
//     workingHours_en: "Mon–Sat, 6 am–3 pm (8 h/day)",
//     hostName: "Timo Heikkinen",
//     hostInitials: "TH",
//     hostMemberSince_fi: "Syyskuu 2019",
//     hostMemberSince_en: "September 2019",
//     hostRating: 4.5,
//     hostReviews: 29,
//   },
//   {
//     id: 6,
//     name: "Niemi Marjatila",
//     location_fi: "Joensuu, Pohjois-Karjala",
//     location_en: "Joensuu, North Karelia",
//     city: "Joensuu",
//     region_fi: "Pohjois-Karjala",
//     region_en: "North Karelia",
//     type: "picking",
//     produce_fi: "Mustikkakentät",
//     produce_en: "Blueberry fields",
//     price: "4.00",
//     unit: "kg",
//     dateStart: "25.7.",
//     dateEnd: "20.8.",
//     seasonStart: "2025-07-25",
//     seasonEnd: "2025-08-20",
//     rating: 4.9,
//     reviews: 55,
//     image: "https://images.unsplash.com/photo-1597389030828-c5218bdf7fa4?w=900&h=520&fit=crop&auto=format",
//     galleryImages: [
//       "https://images.unsplash.com/photo-1725714871679-95dde71f1b63?w=400&h=260&fit=crop&auto=format",
//       "https://images.unsplash.com/photo-1586007173401-3821e3092abf?w=400&h=260&fit=crop&auto=format",
//       "https://images.unsplash.com/photo-1488650989610-0d7e27dc293c?w=400&h=260&fit=crop&auto=format",
//     ],
//     distance: "201 km",
//     openSpots: 30,
//     tags_fi: ["Luomu", "Kaunis maisema", "Parkkipaikka", "Laavu"],
//     tags_en: ["Organic", "Scenic location", "Parking", "Lean-to shelter"],
//     description_fi: "Niemen marjatila sijaitsee Pohjois-Karjalan kauneimpien järvimaisemien äärellä. Luomumustikkakentillämme kasvaa täyteläisiä, makeita mustikkoja, jotka ovat valmiita poimittavaksi heinäkuun lopusta elokuuhun.\n\nAlue on rauhallinen ja luonnonkaunis — poimintapäivä on samalla palauttava luontoretki. Mukana on myös laavu, jossa voi paistaa makkaraa tauon aikana.",
//     description_en: "Niemi Berry Farm is situated amid North Karelia's most beautiful lake landscapes. Our organic blueberry fields produce full-flavoured, sweet berries ready for picking from late July through August.\n\nThe area is peaceful and naturally beautiful — a picking day doubles as a restorative nature excursion. There's also a lean-to shelter where you can grill sausages during breaks.",
//     hostName: "Kaisa Niemi",
//     hostInitials: "KN",
//     hostMemberSince_fi: "Huhtikuu 2021",
//     hostMemberSince_en: "April 2021",
//     hostRating: 4.9,
//     hostReviews: 51,
//   },
// ];
