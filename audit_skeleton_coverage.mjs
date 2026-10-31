import fs from 'fs';
import path from 'path';

function findFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      findFiles(filePath, fileList);
    } else if (file.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const allScreens = findFiles('./src/components/screens');

const dashboards = [];
const collections = [];
const otherViews = [];

for (const screen of allScreens) {
  const content = fs.readFileSync(screen, 'utf-8');
  const filename = path.basename(screen);
  
  const isDashboard = filename.toLowerCase().includes('dashboard');
  const hasUniversalCollection = content.includes('UniversalDataCollection');
  const hasSkeleton = content.includes('useSkeletonLoading') || content.includes('Skeleton');
  const usesSkeletonCollectionScreen = content.includes('SkeletonCollectionScreen');
  const usesDedicatedSkeleton = content.includes('SkeletonDashboard') || content.includes('SkeletonAnalytics');
  
  if (isDashboard) {
    dashboards.push({
      file: screen,
      hasSkeleton,
      usesDedicatedSkeleton,
    });
  } else if (hasUniversalCollection) {
    collections.push({
      file: screen,
      hasSkeleton,
      usesSkeletonCollectionScreen,
    });
  } else {
    otherViews.push({
      file: screen,
      hasSkeleton,
    });
  }
}

console.log('=== DASHBOARD VIEWS ===');
dashboards.forEach(d => {
  console.log(`${d.file}: hasSkeleton=${d.hasSkeleton}, usesDedicatedSkeleton=${d.usesDedicatedSkeleton}`);
});

console.log('\n=== UNIVERSAL DATA COLLECTION VIEWS ===');
collections.forEach(c => {
  console.log(`${c.file}: hasSkeleton=${c.hasSkeleton}, usesSkeletonCollectionScreen=${c.usesSkeletonCollectionScreen}`);
});

console.log('\n=== OTHER VIEWS ===');
otherViews.forEach(o => {
  console.log(`${o.file}: hasSkeleton=${o.hasSkeleton}`);
});
