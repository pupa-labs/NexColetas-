import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatCurrencyBRL,
  maskCEP,
  maskCNPJ,
  maskCPF,
  maskPhoneBR,
  validateCEP,
  validateCNPJ,
  validateCPF,
  validateDateBR,
  validateEmail,
  validatePhoneBR,
} from './smartData.ts';

test('NexColetas Smart Data — Validação e máscara de CPF', () => {
  assert.equal(maskCPF('52998224725'), '529.982.247-25');
  assert.equal(validateCPF('52998224725').valid, true);
  assert.equal(validateCPF('000.000.000-00').valid, false);
  assert.equal(validateCPF('11111111111').valid, false);
  assert.equal(validateCPF('52998224720').valid, false);
});

test('NexColetas Smart Data — Validação e máscara de CNPJ', () => {
  assert.equal(maskCNPJ('11444777000161'), '11.444.777/0001-61');
  assert.equal(validateCNPJ('11.444.777/0001-61').valid, true);
  assert.equal(validateCNPJ('00.000.000/0000-00').valid, false);
  assert.equal(validateCNPJ('11.444.777/0001-62').valid, false);
});

test('NexColetas Smart Data — Validação de Telefone e DDD (Manhuaçu 33)', () => {
  assert.equal(maskPhoneBR('33988124410'), '(33) 98812-4410');
  assert.equal(validatePhoneBR('(33) 98812-4410').valid, true);
  assert.equal(validatePhoneBR('(00) 98812-4410').valid, false);
  assert.equal(validatePhoneBR('(33) 88812-4410').valid, false);
});

test('NexColetas Smart Data — Validação de CEP, E-mail, Data e Moeda BRL', () => {
  assert.equal(maskCEP('36900000'), '36900-000');
  assert.equal(validateCEP('36900-000').valid, true);
  assert.equal(validateEmail('  Contato@NexColetas.com.br ').formatted, 'contato@nexcoletas.com.br');
  assert.equal(validateDateBR('29/02/2025').valid, false);
  assert.equal(validateDateBR('15/03/2026').valid, true);
  assert.match(formatCurrencyBRL(1250), /1\.250,00/);
});
