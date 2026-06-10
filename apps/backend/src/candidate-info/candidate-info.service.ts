import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ArrayContains, Repository } from 'typeorm';
import { CandidateInfo } from './candidate-info.entity';

/**
 * Service to interface with the candidate repository.
 */
@Injectable()
export class CandidateInfoService {
  private readonly logger = new Logger(CandidateInfoService.name);

  constructor(
    @InjectRepository(CandidateInfo)
    private readonly repo: Repository<CandidateInfo>,
  ) {}

  /**
   * Creates an candidate (candidate info) in the repository.
   * @param appId The corresponding application id of the candidate to create.
   * @param email The email of the candidate (primary key).
   * @returns The created candidate.
   * @throws {BadRequestException} if any of the fields are invalid.
   * @throws {Error} If the repository throws an error.
   */
  async create(appId: number, email: string): Promise<CandidateInfo> {
    if (!appId || appId <= 0) {
      throw new BadRequestException('Valid app ID is required');
    }

    if (!email || email.trim().length === 0) {
      throw new BadRequestException('candidate email is required');
    }

    const normalizedEmail = email.trim();

    return this.repo.manager.transaction(async (manager) => {
      await manager.query(
        'SELECT pg_advisory_xact_lock(hashtext($1)::bigint)',
        [normalizedEmail],
      );

      const repo = manager.getRepository(CandidateInfo);
      const existing = await repo.findOne({
        where: { email: normalizedEmail },
        lock: { mode: 'pessimistic_write' },
      });

      if (existing) {
        if (!existing.appIds.includes(appId)) {
          existing.appIds = [...existing.appIds, appId].sort((a, b) => a - b);
        }
        return repo.save(existing);
      }

      const candidate: CandidateInfo = repo.create({
        email: normalizedEmail,
        appIds: [appId],
      });

      return repo.save(candidate);
    });
  }

  /**
   * Returns a specific candidate by email.
   * @param email The email of the desired candidate (primary key).
   * @returns The candidate with the desired email.
   * @throws {BadRequestException} if email is invalid.
   * @throws {NotFoundException} if the candidate with the specified email does not exist.
   * @throws {Error} If the repository throws an error.
   */
  async findOne(email: string): Promise<CandidateInfo> {
    if (!email || email.trim().length === 0) {
      throw new BadRequestException('candidate email is required');
    }

    const normalizedEmail = email.trim();
    this.logger.log(`Looking up candidate_info by email=${normalizedEmail}`);

    const candidate = await this.repo.findOneBy({ email: normalizedEmail });
    if (!candidate) {
      this.logger.warn(
        `No candidate_info found for email=${normalizedEmail}. Returning 404.`,
      );
      throw new NotFoundException(`candidate with email ${email} not found`);
    }

    this.logger.log(
      `Found candidate_info for email=${normalizedEmail} appIds=${candidate.appIds.join(
        ',',
      )}`,
    );

    return candidate;
  }

  /**
   * Returns the latest app id for a candidate email using the highest appId in appIds.
   * @param email The email of the desired candidate.
   * @returns The latest app id for that candidate.
   * @throws {NotFoundException} if the candidate has no applications.
   */
  async findLatestAppId(email: string): Promise<number> {
    const candidate = await this.findOne(email);
    const latestAppId = Math.max(...candidate.appIds);

    if (!Number.isFinite(latestAppId)) {
      throw new NotFoundException(
        `candidate with email ${email} has no applications`,
      );
    }

    return latestAppId;
  }

  /**
   * Returns all candidates in the repository.
   * @returns All candidates in the repository.
   * @throws {Error} If the repository throws an error.
   */
  async findAll(): Promise<CandidateInfo[]> {
    return this.repo.find();
  }

  async findByAppId(appId: number) {
    if (!appId || appId <= 0) {
      throw new BadRequestException('Valid app ID is required');
    }

    return this.repo.find({ where: { appIds: ArrayContains([appId]) } });
  }

  /**
   * Deletes an candidate by email.
   * @param email The email of the candidate to delete (primary key).
   * @returns The deleted candidate.
   * @throws {Error} If the repository throws an error.
   * @throws {NotFoundException} if the candidate with the specified email does not exist.
   */
  async delete(email: string): Promise<CandidateInfo> {
    const candidate = await this.findOne(email);
    return this.repo.remove(candidate);
  }
}
