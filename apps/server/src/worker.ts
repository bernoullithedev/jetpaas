import { Worker, Job } from 'bullmq';
import { appendDeploymentLog, getDeploymentById, updateDeploymentStatus } from './database.js';
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';
import fs from 'fs';
import path from 'path';
import { DeploymentRecord } from './types.js';


async function pendingToBuilding(deployment: DeploymentRecord) {
  if (deployment.source.type === 'git') {
    // TODO: clone the git repository
    appendDeploymentLog(deployment.id, 'Cloning repository...', new Date().toISOString());

    const cloneDir = path.resolve(process.cwd(), '../repo');
     await git.clone({
        fs,
        http,
        dir: cloneDir,
        url: deployment.source.url!,
        depth: 1,
        onProgress: (progress) => {
          appendDeploymentLog(deployment.id, `Cloning repository. ${progress.phase}: ${progress.loaded}/${progress.total}`, new Date().toISOString());
        },
        onMessage: (message) => {
          appendDeploymentLog(deployment.id, message, new Date().toISOString());
        },
    });
    updateDeploymentStatus(deployment.id, 'building');
    return
  }
  if (deployment.source.type === 'upload') {
    // TODO: extract the zip file
    appendDeploymentLog(deployment.id, `Extracting zip file: ${deployment.source.filename}`, new Date().toISOString());
    
    updateDeploymentStatus(deployment.id, 'building');
    return;
  }

}

async function buildingToDeploying(deployment: DeploymentRecord) {
  // involke Railpack (Phase 3)
  console.log('Building to deploying...');
  return;
}

async function deployingToRunning(deployment: DeploymentRecord) {
  // docker run the image
  console.log('Deploying to running...');
  return;
}

async function runningToCompleted(deployment: DeploymentRecord) {
  // update the DB + notify SSE clients
  console.log('Running to completed...');
  return;
}
const worker = new Worker('deploy', async (job: Job) => {
  const deploymentId = job.data.deploymentId as string;
  const deployment = getDeploymentById(deploymentId);

  if (!deployment) {
    throw new Error(`Deployment ${deploymentId} not found`);
  }

  switch (deployment.status) {
    case 'pending':
      // start building
     await pendingToBuilding(deployment);
     return;
    case 'building':
      await buildingToDeploying(deployment);
      return;
    case 'deploying':
      await deployingToRunning(deployment);
      return;
    case 'running':
      await runningToCompleted(deployment);
      return;
    default:
      // unknown status
      throw new Error(`Unknown deployment status: ${deployment.status}`);
  }
}, { connection: 
  { host: process.env.REDIS_HOST,
     port: parseInt(process.env.REDIS_PORT!),
      password: process.env.REDIS_PASSWORD 
    }});

worker.on('error', (error) => {
  console.error('Worker error', error);
});

worker.on('closed', () => {
  console.log('Worker closed');
});

worker.on('ready', () => {
  console.log('Worker ready');
});
