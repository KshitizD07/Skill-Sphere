// server/repositories/ExampleRepository.js
import BaseRepository from './BaseRepository';

class ExampleRepository extends BaseRepository {
  get model() {
    return 'Example';
  }
}

export default ExampleRepository;
