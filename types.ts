export interface VoteRecord {
  departmentCode: string;
  departmentName: string;
  municipalityCode: string;
  municipalityName: string;
  zoneCode: string;
  sectorCode: string;
  pollingPlaceName: string;
  tableNumber: string;
  communeCode: string;
  communeName: string;
  corporationCode: string;
  corporationName: string;
  candidateCode: string;
  candidateName: string;
  partyCode: string;
  partyName: string;
  votes: number;
}

export interface LocationData {
  name: string; // Polling Place Name
  locationType: 'Puesto' | 'Zona';
  parentLocation: string; // Commune or Municipality Name
  lat: number;
  lng: number;
  totalVotes: number;
  candidates: Record<string, number>;
}

export interface GeoCoordinate {
  lat: number;
  lng: number;
}

export interface GroundingChunk {
  web?: {
    uri?: string;
    title?: string;
  };
  maps?: {
    uri?: string;
    title?: string;
    placeAnswerSources?: {
      reviewSnippets?: {
        reviewText?: string;
      }[];
    };
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  groundingChunks?: GroundingChunk[];
}