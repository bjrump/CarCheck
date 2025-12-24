import { getCars, saveCars } from '../app/lib/data';
import { Car } from '../app/lib/types';

async function migrateEventLog() {
  console.log('Starting eventLog migration...');
  
  try {
    const cars = await getCars();
    console.log(`Found ${cars.length} cars`);
    
    let updated = 0;
    const updatedCars = cars.map(car => {
      if (!car.eventLog) {
        console.log(`Adding eventLog to car: ${car.make} ${car.model} (${car.id})`);
        updated++;
        return {
          ...car,
          eventLog: [],
        };
      }
      return car;
    });
    
    if (updated > 0) {
      await saveCars(updatedCars);
      console.log(`Migration complete! Updated ${updated} cars.`);
    } else {
      console.log('No cars needed migration. All cars already have eventLog.');
    }
    
    // Show summary
    updatedCars.forEach(car => {
      console.log(`Car ${car.make} ${car.model}: ${car.eventLog?.length || 0} events`);
    });
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateEventLog();
