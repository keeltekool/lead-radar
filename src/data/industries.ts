export interface Industry {
  id: string;
  labelEt: string;
  labelEn: string;
  searchTermEt: string;
  searchTermEn: string;
}

export const INDUSTRIES: Industry[] = [
  { id: "construction", labelEt: "Ehitus / Remont", labelEn: "Construction / Renovation", searchTermEt: "ehitusfirma", searchTermEn: "construction company" },
  { id: "cleaning", labelEt: "Puhastusteenused", labelEn: "Cleaning Services", searchTermEt: "puhastusfirma", searchTermEn: "cleaning company" },
  { id: "accounting", labelEt: "Raamatupidamine", labelEn: "Accounting", searchTermEt: "raamatupidamine", searchTermEn: "accounting firm" },
  { id: "auto_repair", labelEt: "Autoteenindus", labelEn: "Auto Repair", searchTermEt: "autoteenindus", searchTermEn: "auto repair" },
  { id: "beauty", labelEt: "Ilusalong / Spa", labelEn: "Beauty / Wellness", searchTermEt: "ilusalong", searchTermEn: "beauty salon" },
  { id: "dental", labelEt: "Hambaravi", labelEn: "Dental / Medical", searchTermEt: "hambaravi", searchTermEn: "dental clinic" },
  { id: "real_estate", labelEt: "Kinnisvarabüroo", labelEn: "Real Estate", searchTermEt: "kinnisvarabüroo", searchTermEn: "real estate agency" },
  { id: "legal", labelEt: "Õigusteenused", labelEn: "Legal Services", searchTermEt: "advokaadibüroo", searchTermEn: "law firm" },
  { id: "logistics", labelEt: "Logistika / Transport", labelEn: "Logistics / Transport", searchTermEt: "veoteenus", searchTermEn: "transport company" },
  { id: "property_mgmt", labelEt: "Kinnisvara haldus", labelEn: "Property Management", searchTermEt: "kinnisvara haldus", searchTermEn: "property management" },
  { id: "security", labelEt: "Turvateenused", labelEn: "Security Services", searchTermEt: "turvafirma", searchTermEn: "security company" },
  { id: "it_services", labelEt: "IT teenused", labelEn: "IT Services", searchTermEt: "IT teenused", searchTermEn: "IT services" },
  { id: "pet_services", labelEt: "Loomateenused", labelEn: "Pet Services", searchTermEt: "loomakliinik", searchTermEn: "veterinary clinic" },
  { id: "printing", labelEt: "Trükiteenused", labelEn: "Printing / Signs", searchTermEt: "trükikoda", searchTermEn: "printing company" },
];

export const ESTONIAN_CITIES = [
  { id: "tallinn", name: "Tallinn" },
  { id: "tartu", name: "Tartu" },
  { id: "parnu", name: "Pärnu" },
  { id: "narva", name: "Narva" },
  { id: "kohtla_jarve", name: "Kohtla-Järve" },
  { id: "viljandi", name: "Viljandi" },
  { id: "rakvere", name: "Rakvere" },
  { id: "maardu", name: "Maardu" },
  { id: "kuressaare", name: "Kuressaare" },
  { id: "haapsalu", name: "Haapsalu" },
  { id: "johvi", name: "Jõhvi" },
  { id: "paide", name: "Paide" },
  { id: "keila", name: "Keila" },
  { id: "valga", name: "Valga" },
  { id: "voru", name: "Võru" },
];
