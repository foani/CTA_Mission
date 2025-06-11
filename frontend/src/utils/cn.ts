import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * cn 유틸리티 함수
 * - clsx와 tailwind-merge를 조합한 클래스명 병합 함수
 * - Tailwind CSS 클래스의 충돌을 자동으로 해결
 * - 조건부 클래스명 적용 지원
 * 
 * @param inputs - 클래스명 값들 (문자열, 객체, 배열 등)
 * @returns 병합된 클래스명 문자열
 * 
 * @example
 * cn('px-2 py-1', 'bg-blue-500')
 * cn('px-2', { 'py-1': true, 'bg-red-500': false })
 * cn(['px-2', 'py-1'], 'bg-blue-500')
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}