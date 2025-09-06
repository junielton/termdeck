#!/usr/bin/env node

// Simple test for environment detection
import { detectEnvironment } from '../dist/utils/environment.js';

async function testEnvironment() {
  console.log('🧪 Testing TermDeck Environment Detection\n');
  
  try {
    const result = await detectEnvironment();
    
    console.log('📊 Detection Results:');
    console.log(`  Mode: ${result.mode}`);
    console.log(`  Is WSL: ${result.isWSL}`);
    console.log(`  Is Windows: ${result.isWindows}`);
    console.log(`  Has WSL Access: ${result.hasWSLAccess}`);
    if (result.serverUrl) console.log(`  Server URL: ${result.serverUrl}`);
    
    console.log('\n💡 Suggestions:');
    result.suggestions.forEach(suggestion => {
      console.log(`  • ${suggestion}`);
    });
    
    console.log('\n✅ Environment detection completed successfully!');
  } catch (error) {
    console.error('❌ Environment detection failed:', error);
    process.exit(1);
  }
}

testEnvironment();