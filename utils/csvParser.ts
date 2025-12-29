import { VoteRecord, LocationData, GeoCoordinate } from '../types';
import { LOCATION_COORDINATES } from '../constants';

export const parseCSV = (csvText: string): VoteRecord[] => {
  const lines = csvText.trim().split('\n');
  const records: VoteRecord[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    
    const parts = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
    
    if (parts && parts.length >= 17) {
      const cleanParts = parts.map(p => p.replace(/^"|"$/g, '').trim());
      
      const votes = parseInt(cleanParts[cleanParts.length - 1], 10);
      
      if (!isNaN(votes)) {
        records.push({
          departmentCode: cleanParts[0],
          departmentName: cleanParts[1],
          municipalityCode: cleanParts[2],
          municipalityName: cleanParts[3],
          zoneCode: cleanParts[4],
          sectorCode: cleanParts[5],
          pollingPlaceName: cleanParts[6],
          tableNumber: cleanParts[7],
          communeCode: cleanParts[8],
          communeName: cleanParts[9],
          corporationCode: cleanParts[10],
          corporationName: cleanParts[11],
          candidateCode: cleanParts[15], 
          candidateName: cleanParts[16],
          partyCode: cleanParts[13],
          partyName: cleanParts[14],
          votes: votes
        });
      }
    }
  }
  return records;
};

// Simple pseudo-random generator seeded by string to ensure a polling place always gets the same jitter
const getPseudoRandom = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return (Math.abs(hash) % 10000) / 10000;
};

export const aggregateByLocation = (records: VoteRecord[]): LocationData[] => {
  const map = new Map<string, LocationData>();

  for (const record of records) {
    // Key is now the Polling Place Name + Commune to ensure uniqueness
    const pollingPlace = record.pollingPlaceName;
    const parentZone = record.communeName || record.municipalityName;
    const uniqueKey = `${pollingPlace}-${parentZone}`;
    
    // Find base coordinates for the Commune/Municipality
    let baseCoords = LOCATION_COORDINATES[record.communeName];
    if (!baseCoords) {
      baseCoords = LOCATION_COORDINATES[record.municipalityName];
    }

    if (baseCoords) {
      if (!map.has(uniqueKey)) {
        // Apply deterministic jitter. 
        // 0.015 degrees is roughly 1.5km, spreading points out within the commune.
        const latOffset = (getPseudoRandom(uniqueKey + "lat") - 0.5) * 0.015;
        const lngOffset = (getPseudoRandom(uniqueKey + "lng") - 0.5) * 0.015;

        map.set(uniqueKey, {
          name: pollingPlace,
          locationType: 'Puesto',
          parentLocation: parentZone,
          lat: baseCoords.lat + latOffset,
          lng: baseCoords.lng + lngOffset,
          totalVotes: 0,
          candidates: {}
        });
      }

      const entry = map.get(uniqueKey)!;
      entry.totalVotes += record.votes;
      
      if (!entry.candidates[record.candidateName]) {
        entry.candidates[record.candidateName] = 0;
      }
      entry.candidates[record.candidateName] += record.votes;
    }
  }

  return Array.from(map.values());
};