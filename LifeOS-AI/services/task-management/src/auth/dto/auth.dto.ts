import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'demo@lifeos.ai' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Demo123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(72) // bcrypt max effective length
  password!: string;

  @ApiProperty({ example: 'Demo User' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  displayName!: string;
}

export class LoginDto {
  @ApiProperty({ example: 'demo@lifeos.ai' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Demo123!' })
  @IsString()
  @MinLength(1)
  password!: string;
}

export class AuthTokenDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  tokenType!: string;

  @ApiProperty({ description: 'Seconds until expiry (informational).' })
  expiresIn!: string;

  @ApiProperty()
  user!: { id: string; email: string; displayName: string };
}
