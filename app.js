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

    // Helper function to process comma-separated strings into arrays
    const processArrayField = (field) => {
      if (!field || field === 'None' || field === 'notes' || field === 'keywords, keyword') {
        return [];
      }
      return field.split(',').map(item => item.trim()).filter(item => item);
    };

    // Helper function to format duration
    const formatDuration = (duration) => {
      if (!duration) return null;
      // Remove decimal portion and ensure proper format
      return duration.replace(/^0?(\d+):(\d+)\.\d+$/, '$1:$2');
    };

    // Group tracks by album (CDTitle)
    const albums = {};
    importData.forEach(entry => {
      const artistId = artistMap[entry.Artist] || null;
      const formattedDuration = formatDuration(entry.Duration);

      if (!albums[entry.CDTitle]) {
        albums[entry.CDTitle] = {
          status: 'draft',
          library: entry.Library.toLowerCase(),
          artist: artistId,
          title: entry.CDTitle,
          year_released: entry.year_released || null,
          tracks: []
        };
      }

      albums[entry.CDTitle].tracks.push({
        title: entry.TrackTitle,
        year: null,
        length: formattedDuration,
        scotts_picks: processArrayField(entry.Notes),
        gregs_picks: processArrayField(entry.CDDescription),
        master: entry.Tape || "NULL",
        description: entry.Description || "",
        bpm: parseInt(entry.BPM) || null,
        tags: processArrayField(entry.Keywords)
      });
    });

    // Convert the albums object to an array
    const transformedData = Object.values(albums);

    // Write the transformed data to the output JSON file
    await fs.writeFile(outputFilePath, JSON.stringify(transformedData, null, 2), 'utf-8');

    console.log('Processing completed. Output file created:', outputFilePath);
  } catch (error) {
    console.error('Error processing files:', error);
  }
})();