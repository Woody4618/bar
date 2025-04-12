use anchor_lang::solana_program::native_token::LAMPORTS_PER_SOL;
use anchor_lang::system_program;
use anchor_lang::{prelude::*, solana_program::pubkey};
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked};

declare_id!("HHpyCo9M9ZX2bhiYyYznMagry6eGJZxykPEAes54o29S");

const TREASURE_PUBKEY: Pubkey = pubkey!("GsfNSuZFrT2r4xzSndnCSs9tTXwt47etPqU8yFVnDcXd");

#[error_code]
pub enum ShotErrorCode {
    #[msg("InvalidTreasury")]
    InvalidTreasury,
    #[msg("ProductAlreadyExists")]
    ProductAlreadyExists,
}

#[program]
pub mod solana_bar {
    use super::*;
    const SHOT_PRICE: u64 = LAMPORTS_PER_SOL / 100; // 0.01 SOL

    pub fn initialize(_ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }

    pub fn add_product(
        ctx: Context<AddProduct>,
        name: String,
        price: u64,
        decimals: u8,
        mint: Pubkey,
    ) -> Result<()> {
        // Check if product with same mint already exists
        for product in &ctx.accounts.receipts.products {
            if product.mint == mint {
                return Err(ShotErrorCode::ProductAlreadyExists.into());
            }
        }

        // Add new product
        ctx.accounts.receipts.products.push(Products {
            name,
            price,
            decimals,
            mint,
        });

        Ok(())
    }

    pub fn buy_shot(ctx: Context<BuyShot>) -> Result<()> {
        if TREASURE_PUBKEY != *ctx.accounts.treasury.key {
            return Err(ShotErrorCode::InvalidTreasury.into());
        }

        // Add a new receipt to the receipts account.
        let receipt_id = ctx.accounts.receipts.total_shots_sold;
        ctx.accounts.receipts.receipts.push(Receipt {
            buyer: *ctx.accounts.signer.key,
            was_delivered: false,
            price: 1,
            timestamp: Clock::get()?.unix_timestamp,
            receipt_id,
            table_number: 1,
        });

        let len = ctx.accounts.receipts.receipts.len();
        if len >= 10 {
            ctx.accounts.receipts.receipts.remove(0);
        }

        // Increment the total shots sold.
        ctx.accounts.receipts.total_shots_sold = ctx
            .accounts
            .receipts
            .total_shots_sold
            .checked_add(1)
            .unwrap();

        // Transfer lamports to the treasury for payment.
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.signer.to_account_info().clone(),
                to: ctx.accounts.treasury.to_account_info().clone(),
            },
        );
        system_program::transfer(cpi_context, SHOT_PRICE)?;

        // Get token decimals
        let decimals = ctx.accounts.mint.decimals;

        // Create CPI context for token transfer
        let cpi_accounts = TransferChecked {
            mint: ctx.accounts.mint.to_account_info(),
            from: ctx.accounts.sender_token_account.to_account_info(),
            to: ctx.accounts.recipient_token_account.to_account_info(),
            authority: ctx.accounts.signer.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_context = CpiContext::new(cpi_program, cpi_accounts);

        // Transfer tokens using transfer_checked
        token_interface::transfer_checked(cpi_context, 1, decimals)?;

        Ok(())
    }

    pub fn mark_shot_as_delivered(ctx: Context<MarkShotAsDelivered>, recipe_id: u64) -> Result<()> {
        msg!("Marked shot as delivered");
        for i in 0..ctx.accounts.receipts.receipts.len() {
            msg!("Marked shot as delivered  {}", i);
            if ctx.accounts.receipts.receipts[i].receipt_id == recipe_id {
                msg!("Marked shot as delivered {} {} ", recipe_id, i);
                ctx.accounts.receipts.receipts[i].was_delivered = true;
            }
        }
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = authority, space = 5000, seeds = [b"receipts"], bump)]
    pub receipts: Account<'info, Receipts>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct AddProduct<'info> {
    #[account(mut, seeds = [b"receipts"], bump)]
    pub receipts: Account<'info, Receipts>,
    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct BuyShot<'info> {
    #[account(mut, seeds = [b"receipts"], bump)]
    pub receipts: Account<'info, Receipts>,
    #[account(mut)]
    pub signer: Signer<'info>,
    /// CHECK: checked against the treasury pubkey.
    #[account(mut)]
    pub treasury: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
    #[account(mut)]
    pub mint: InterfaceAccount<'info, Mint>,
    // The source token account to transfer tokens from
    #[account(mut)]
    pub sender_token_account: InterfaceAccount<'info, TokenAccount>,
    // The destination token account to receive tokens
    #[account(mut)]
    pub recipient_token_account: InterfaceAccount<'info, TokenAccount>,
    // The token program that will process the transfer
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct MarkShotAsDelivered<'info> {
    #[account(mut, seeds = [b"receipts"], bump)]
    pub receipts: Account<'info, Receipts>,
    #[account(mut)]
    pub signer: Signer<'info>,
}

#[account()]
pub struct Receipts {
    pub receipts: Vec<Receipt>,
    pub total_shots_sold: u64,
    pub bar_name: String,
    pub authority: Pubkey,
    pub products: Vec<Products>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct Products {
    pub price: u64,
    pub decimals: u8,
    pub mint: Pubkey,
    pub name: String,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct Receipt {
    pub receipt_id: u64,
    pub buyer: Pubkey,
    pub was_delivered: bool,
    pub price: u64,
    pub timestamp: i64,
    pub table_number: u8,
}
