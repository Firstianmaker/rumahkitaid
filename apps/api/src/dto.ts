import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  MinLength,
  MaxLength,
  IsInt,
  Min,
  Max,
  IsNumber,
  IsOptional,
  IsIn,
  IsArray,
  IsBoolean,
  ArrayUnique,
  ArrayMaxSize,
  Matches,
} from 'class-validator';
export class LoginDto {
  @ApiProperty() @IsEmail() email!: string;
  @ApiProperty() @IsString() @MinLength(10) @MaxLength(100) password!: string;
}
export class RegisterDto extends LoginDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(100) name!: string;
  @ApiProperty() @Matches(/^[+\d\s-]{8,20}$/) phone!: string;
}
export class ApplicationDto {
  @ApiProperty() @IsString() unitId!: string;
  @ApiProperty() @Matches(/^\d{4}-\d{2}-\d{2}$/) moveInDate!: string;
  @ApiProperty() @IsInt() @Min(1) @Max(10) occupants!: number;
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(150) occupation!: string;
  @ApiProperty() @IsString() @MinLength(10) @MaxLength(1000) currentAddress!: string;
  @ApiProperty({ enum: ['EMPLOYEE', 'SELF_EMPLOYED', 'FREELANCE', 'RETIRED', 'OTHER'] })
  @IsIn(['EMPLOYEE', 'SELF_EMPLOYED', 'FREELANCE', 'RETIRED', 'OTHER'])
  employmentType!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(150) employerName?: string;
  @ApiProperty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999999999999)
  monthlyIncome!: number;
  @ApiProperty() @IsString() @MinLength(3) @MaxLength(150) incomeSource!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() incomeDocumentId?: string;
  @ApiProperty({ enum: ['ALONE', 'PARTNER', 'FAMILY', 'SHARED'] })
  @IsIn(['ALONE', 'PARTNER', 'FAMILY', 'SHARED'])
  householdType!: string;
  @ApiProperty() @IsInt() @Min(0) @Max(10) adultCount!: number;
  @ApiProperty() @IsInt() @Min(0) @Max(9) childCount!: number;
  @ApiProperty() @IsInt() @Min(0) @Max(10) elderlyCount!: number;
  @ApiProperty() @IsInt() @Min(0) @Max(20) petCount!: number;
  @ApiProperty({
    type: [String],
    enum: ['Kucing', 'Anjing', 'Burung', 'Ikan', 'Kelinci', 'Lainnya'],
    isArray: true,
  })
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(6)
  @IsIn(['Kucing', 'Anjing', 'Burung', 'Ikan', 'Kelinci', 'Lainnya'], { each: true })
  petTypes!: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) petNotes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}
export class ApprovalDto {
  @ApiProperty() @Matches(/^\d{4}-\d{2}-\d{2}$/) startDate!: string;
  @ApiProperty() @IsInt() @Min(1) @Max(60) months!: number;
  @ApiProperty() @IsInt() @Min(1) @Max(31) dueDay!: number;
  @ApiProperty() @IsNumber() @Min(1) @Max(999999999) rent!: number;
  @ApiProperty() @IsNumber() @Min(1) @Max(999999999) deposit!: number;
}
export class ReasonDto {
  @ApiProperty() @IsString() @MinLength(3) @MaxLength(1000) reason!: string;
}
export class DocumentDto {
  @ApiProperty() @IsString() documentId!: string;
}
export class ReviewDto {
  @ApiProperty() @IsBoolean() approve!: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) reason?: string;
}
export class SimulationDto {
  @ApiProperty({ enum: ['success', 'failed'] }) @IsIn(['success', 'failed']) outcome!:
    'success' | 'failed';
}
export class MeterDto {
  @ApiProperty() @Matches(/^\d{4}-(0[1-9]|1[0-2])$/) period!: string;
  @ApiProperty() @IsNumber() @Min(0) electricityStart!: number;
  @ApiProperty() @IsNumber() @Min(0) electricityEnd!: number;
  @ApiProperty() @IsNumber() @Min(0) waterStart!: number;
  @ApiProperty() @IsNumber() @Min(0) waterEnd!: number;
}
export class InspectionDto {
  @ApiProperty() @IsIn(['IN', 'OUT']) kind!: 'IN' | 'OUT';
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsIn(['keys', 'walls', 'plumbing', 'electricity', 'cleanliness'], { each: true })
  checklist!: string[];
  @ApiProperty() @IsString() @MaxLength(3000) notes!: string;
  @ApiProperty({ type: [String] }) @IsArray() @IsString({ each: true }) documentIds!: string[];
  @ApiProperty() @IsNumber() @Min(0) electricity!: number;
  @ApiProperty() @IsNumber() @Min(0) water!: number;
}
export class SettlementDto extends ReasonDto {
  @ApiProperty() @IsNumber() @Min(0) @Max(999999999) damages!: number;
}
export class TicketDto {
  @ApiProperty() @IsString() leaseId!: string;
  @ApiProperty() @IsString() @MinLength(3) @MaxLength(150) title!: string;
  @ApiProperty() @IsString() @MinLength(5) @MaxLength(5000) description!: string;
  @ApiProperty() @IsIn(['LOW', 'NORMAL', 'URGENT']) priority!: string;
  @ApiProperty({ type: [String] }) @IsArray() @IsString({ each: true }) documentIds!: string[];
}
export class CommentDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(3000) text!: string;
}
export class TicketStatusDto {
  @ApiProperty() @IsIn(['OPEN', 'IN_PROGRESS', 'RESOLVED']) status!:
    'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
}
export class AnnouncementDto {
  @ApiProperty() @IsString() @MinLength(3) @MaxLength(150) title!: string;
  @ApiProperty() @IsString() @MinLength(5) @MaxLength(5000) body!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() unitId?: string;
}
export class UnitDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(20) code!: string;
  @ApiProperty() @IsString() @MinLength(3) @MaxLength(100) name!: string;
  @ApiProperty() @IsString() @MaxLength(4000) description!: string;
  @ApiProperty() @IsNumber() @Min(1) @Max(999999999) rent!: number;
  @ApiProperty() @IsNumber() @Min(1) @Max(999999999) deposit!: number;
  @ApiProperty() @IsInt() @Min(1) @Max(10000) area!: number;
  @ApiProperty() @IsInt() @Min(1) @Max(50) bedrooms!: number;
  @ApiProperty() @IsInt() @Min(1) @Max(50) bathrooms!: number;
  @ApiProperty({ type: [String] }) @IsArray() @IsString({ each: true }) amenities!: string[];
}
export class AvailabilityDto {
  @ApiProperty() @IsIn(['AVAILABLE', 'MAINTENANCE']) status!: 'AVAILABLE' | 'MAINTENANCE';
}
export class SettingsDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(100) name!: string;
  @ApiProperty() @IsString() @MaxLength(300) address!: string;
  @ApiProperty() @IsString() @MaxLength(100) bankName!: string;
  @ApiProperty() @IsString() @MaxLength(100) bankAccount!: string;
  @ApiProperty() @IsString() @MaxLength(100) bankOwner!: string;
  @ApiProperty() @IsNumber() @Min(0) @Max(1000000) electricityRate!: number;
  @ApiProperty() @IsNumber() @Min(0) @Max(1000000) waterRate!: number;
}
