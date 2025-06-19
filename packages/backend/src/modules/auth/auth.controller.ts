import {Body, Controller, HttpCode, HttpStatus, Post, Req, Res, UnauthorizedException, UseGuards} from '@nestjs/common';
import {ApiBearerAuth, ApiOperation, ApiResponse, ApiTags} from '@nestjs/swagger';
import {AuthService} from './auth.service';
import {LoginDto, RefreshTokenDto} from './dto';
import {LoginResponse, TokenResponse} from './types/auth.types';
import {JwtAuthGuard} from './guards';
import {CurrentUser, Public} from './decorators';
import {JWTPayload} from './types/jwt.types';
import {Request, Response} from 'express';
import {cookieConfig, refreshCookieConfig} from '../../config/security.config';

/**
 * Controller handling authentication endpoints for admin users.
 * Provides login, token refresh, and logout functionality.
 */
@ApiTags('Authentication')
@Controller('api/auth')
export class AuthController {
    constructor(private authService: AuthService) {
    }

    @Public()
    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({summary: 'Admin login'})
    @ApiResponse({status: 200, description: 'Login successful'})
    @ApiResponse({status: 401, description: 'Invalid credentials'})
    async login(
        @Body() loginDto: LoginDto,
        @Res({passthrough: true}) response: Response,
    ): Promise<LoginResponse> {
        const result = await this.authService.login(loginDto);

        // Set access token in httpOnly cookie
        response.cookie('access_token', result.accessToken, cookieConfig);

        // Set refresh token in httpOnly cookie with path restriction
        response.cookie('refresh_token', result.refreshToken, refreshCookieConfig);

        return result;
    }

    @Public()
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({summary: 'Refresh access token'})
    @ApiResponse({status: 200, description: 'Token refreshed successfully'})
    @ApiResponse({status: 401, description: 'Invalid refresh token'})
    async refresh(
        @Body() refreshTokenDto: RefreshTokenDto,
        @Req() request: Request,
        @Res({passthrough: true}) response: Response,
    ): Promise<TokenResponse> {
        // Try to get refresh token from cookie first, fallback to body
        const refreshToken = request.cookies?.refresh_token || refreshTokenDto.refreshToken;

        if (!refreshToken) {
            throw new UnauthorizedException('Refresh token not provided');
        }

        const result = await this.authService.refreshTokens(refreshToken);

        // Update cookies with new tokens
        response.cookie('access_token', result.accessToken, cookieConfig);
        response.cookie('refresh_token', result.refreshToken, refreshCookieConfig);

        return result;
    }

    @UseGuards(JwtAuthGuard)
    @Post('logout')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiBearerAuth()
    @ApiOperation({summary: 'Logout current session'})
    @ApiResponse({status: 204, description: 'Logout successful'})
    async logout(
        @CurrentUser() user: JWTPayload,
        @Res({passthrough: true}) response: Response,
    ): Promise<void> {
        await this.authService.logout(user.sessionId);

        // Clear cookies
        response.clearCookie('access_token');
        response.clearCookie('refresh_token');
    }
}