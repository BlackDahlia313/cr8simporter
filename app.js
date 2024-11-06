const fs = require('fs/promises');
const path = require('path');
const { parse } = require('csv-parse/sync');

(async () => {
  try {
    // File paths (these can be adjusted as needed)
    const importFilePath = path.resolve(__dirname, 'import_file.csv');
    const artistFilePath = path.resolve(__dirname, 'artist_ids.csv');
    const outputFilePath = path.resolve(__dirname, 'output.json');

    // Read and parse the import file
    const importFileContent = await fs.readFile(importFilePath, 'utf-8');
    const importData = parse(importFileContent, { columns: true, skip_empty_lines: true });

    // Read and parse the artist file
    const artistFileContent = await fs.readFile(artistFilePath, 'utf-8');
    const artistData = parse(artistFileContent, { columns: true, skip_empty_lines: true });

    // Create a mapping of artist names to their IDs
    const artistMap = artistData.reduce((map, row) => {
      map[row.name] = row.id;
      return map;
    }, {});

    // Group tracks by album (CDTitle)
    const albums = {};
    importData.forEach(entry => {
      const artistId = artistMap[entry.Artist] || null;
      const formattedDuration = entry.Duration ? entry.Duration.replace(/^0?(\d+):(\d+)\.\d+$/, '$1:$2') : null;

      if (!albums[entry.CDTitle]) {
        albums[entry.CDTitle] = {
          status: 'draft',
          library: 'westbound',
          artist: artistId,
          title: entry.CDTitle,
          year_released: entry.year_released,
          tracks: []
        };
      }

      albums[entry.CDTitle].tracks.push({
        title: entry.TrackTitle,
        bpm: entry.BPM,
        length: formattedDuration
      });
    });

    // Convert the albums object to an array
    const transformedData = Object.values(albums);

    console.log('Parsed Import Data:', importData);
    console.log('Parsed Artist Data:', artistData);

    // Write the transformed data to the output JSON file
    await fs.writeFile(outputFilePath, JSON.stringify(transformedData, null, 2), 'utf-8');

    console.log('Processing completed. Output file created:', outputFilePath);
  } catch (error) {
    console.error('Error processing files:', error);
  }
})();
