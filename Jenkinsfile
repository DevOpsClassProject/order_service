@Library('my-shared-library') _

pipeline {
    agent {
        node { label 'docker-runner' } 
    }

    environment {
        IMAGE_NAME    = "ecommerce-order"
        REGISTRY_USER = "tejung"
        DOCKER_CREDS  = 'docker-hub-token'

        // Database Secrets (Kept here for deployment context)
        DB_PASSWORD_VAL = credentials('db-password-secret')
    }

    stages {
        // STEP 1: Scan Source (package.json) for vulnerable dependencies
        stage('Security: Source Scan') {
            steps {
                trivyScan(severity: 'HIGH,CRITICAL')
            }
        }

        // STEP 2: Build (runs npm test internally) + Image Scan + Push
        stage('Build, Test & Delivery') {
            steps {
                dockerBuildPush(
                    registryUser: env.REGISTRY_USER,
                    imageName: env.IMAGE_NAME,
                    credsId: env.DOCKER_CREDS
                )
            }
        }
        stage('Prepare Environment') {
            steps {
                echo 'Cleaning up dangling Docker networks...'
                // -f (force) skips the confirmation prompt
                // || true ensures the pipeline continues even if prune returns a non-zero exit code
                sh 'docker network prune -f || true'
            }
        }
        // STEP 3: Deploy to Rocky Linux via Docker Compose
        stage('Deploy') {
            when { 
                anyOf { branch 'develop'; branch 'main'; branch 'release/*' } 
            }
            steps {
                echo "Deploying Order Service to ${env.BRANCH_NAME}..."
                sh "docker compose up -d ecommerce-order"
            }
        }
    }

    post {
        success {
            echo "Successfully deployed ${IMAGE_NAME} build #${BUILD_NUMBER}"
            build job: '/DevOps project/ecommerce-integration-tests/main', wait: false
        }
        failure {
            echo "Pipeline failed. Verify logs for Test failures or Security vulnerabilities."
        }
        always {
            sh 'docker image prune -f'
            deleteDir()
        }
    }
}